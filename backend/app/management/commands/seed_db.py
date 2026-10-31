"""Django management command to seed the database with demo users."""

from django.core.management.base import BaseCommand
from django.db import transaction

from app.models import CustomerProfile, User


class Command(BaseCommand):
    help = "Seed the database with demo admin, staff and customer users."

    DEMO_USERS = [
        {
            "email": "admin@subhub.com",
            "password": "Admin@123",
            "role": "admin",
            "first_name": "Olivia",
            "last_name": "Admin",
            "company_name": "BrightLoop Admin",
        },
        {
            "email": "daniel@subhub.com",
            "password": "Staff@123",
            "role": "staff",
            "first_name": "Daniel",
            "last_name": "Reyes",
            "company_name": "BrightLoop Staff",
        },
        {
            "email": "priya@subhub.com",
            "password": "Staff@123",
            "role": "staff",
            "first_name": "Priya",
            "last_name": "Nair",
            "company_name": "BrightLoop Staff",
        },
        {
            "email": "ava@bluebirdcafe.com",
            "password": "Customer@123",
            "role": "customer",
            "first_name": "Ava",
            "last_name": "Thompson",
            "company_name": "Bluebird Cafe",
        },
        {
            "email": "ravi@patellogistics.com",
            "password": "Customer@123",
            "role": "customer",
            "first_name": "Ravi",
            "last_name": "Patel",
            "company_name": "Patel Logistics",
        },
        {
            "email": "sofia@marinstudio.com",
            "password": "Customer@123",
            "role": "customer",
            "first_name": "Sofia",
            "last_name": "Marin",
            "company_name": "Marin Studio",
        },
        {
            "email": "liam@northwindgym.com",
            "password": "Customer@123",
            "role": "customer",
            "first_name": "Liam",
            "last_name": "O Connor",
            "company_name": "Northwind Gym",
        },
    ]

    def handle(self, *args, **options):
        with transaction.atomic():
            for user_data in self.DEMO_USERS:
                email = user_data.pop("email")
                password = user_data.pop("password")
                role = user_data.pop("role")
                company_name = user_data.pop("company_name")

                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "username": email,
                        "role": role,
                        **user_data,
                    },
                )
                if created:
                    user.set_password(password)
                    user.save()
                    self.stdout.write(
                        self.style.SUCCESS(f"Created {role}: {email}")
                    )
                else:
                    user.set_password(password)
                    user.role = role
                    user.first_name = user_data.get("first_name", "")
                    user.last_name = user_data.get("last_name", "")
                    user.save()
                    self.stdout.write(
                        self.style.WARNING(f"Updated {role}: {email}")
                    )

                CustomerProfile.objects.get_or_create(
                    user=user,
                    defaults={"company_name": company_name},
                )

        self.stdout.write(self.style.SUCCESS("Database seeded successfully."))
