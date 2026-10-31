"""Service layer for payment recording and gateway webhook handling."""

from decimal import Decimal
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from ..models import PaymentRecord, Quotation


class PaymentService:
    """Business logic for recording payments and handling gateway webhooks."""

    @classmethod
    def record_payment(
        cls,
        quotation_id: str,
        amount_paid: Decimal,
        payment_method: str,
        recorded_by=None,
        payment_date=None,
        notes: str = "",
        gateway_reference_id: str | None = None,
    ) -> PaymentRecord:
        """
        Create a pending PaymentRecord linked to a Quotation.

        Steps:
        1. Resolve the quotation.
        2. Create PaymentRecord with status DRAFT (pending).
        3. Link customer, plan, and quotation from the quotation record.
        4. Return the created PaymentRecord.
        """
        try:
            quotation = Quotation.objects.select_related(
                "customer", "plan"
            ).get(pk=quotation_id)
        except Quotation.DoesNotExist as exc:
            raise NotFound(f"Quotation with id {quotation_id} not found.") from exc

        if payment_date is None:
            payment_date = timezone.now()

        payment_record = PaymentRecord.objects.create(
            customer=quotation.customer,
            plan=quotation.plan,
            quotation=quotation,
            invoice_id="",
            amount_paid=amount_paid,
            payment_method=payment_method,
            payment_date=payment_date,
            recorded_by=recorded_by,
            notes=notes,
            status=PaymentRecord.Status.DRAFT,
            currency=quotation.currency,
            gateway_reference_id=gateway_reference_id,
        )

        return payment_record

    @classmethod
    def handle_webhook(
        cls,
        gateway_reference_id: str | None = None,
        payment_id: str | None = None,
        status: str = "",
    ) -> PaymentRecord:
        """
        Process a payment gateway webhook status update.

        Steps:
        1. Locate the PaymentRecord by gateway_reference_id or payment_id.
        2. Validate the new status (SUCCESS or FAILED).
        3. Update PaymentRecord.status.
        4. If SUCCESS, mark the linked Quotation as PAID.
        5. Return the updated PaymentRecord.
        """
        if not gateway_reference_id and not payment_id:
            raise ValidationError(
                "Either gateway_reference_id or payment_id is required."
            )

        try:
            if payment_id:
                payment_record = PaymentRecord.objects.select_related(
                    "quotation"
                ).get(payment_id=payment_id)
            else:
                payment_record = PaymentRecord.objects.select_related(
                    "quotation"
                ).get(gateway_reference_id=gateway_reference_id)
        except PaymentRecord.DoesNotExist as exc:
            raise NotFound("Payment record not found.") from exc

        # Normalize status.
        new_status = status.upper()
        if new_status not in (
            PaymentRecord.Status.SUCCESS,
            PaymentRecord.Status.FAILED,
        ):
            raise ValidationError(
                f"Invalid status '{status}'. Must be 'SUCCESS' or 'FAILED'."
            )

        payment_record.status = new_status
        payment_record.gateway_reference_id = (
            gateway_reference_id or payment_record.gateway_reference_id
        )
        payment_record.save()

        # If payment succeeded, mark the linked quotation as PAID.
        if new_status == PaymentRecord.Status.SUCCESS and payment_record.quotation:
            quotation = payment_record.quotation
            quotation.status = Quotation.Status.PAID
            quotation.save()

        return payment_record
