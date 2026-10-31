"""DRF endpoints for products and variants."""

from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from app.api.v1.permissions import IsAdmin, IsStaff
from app.models import Product, ProductVariant
from app.serializers import ProductSerializer, ProductVariantSerializer


class ProductListView(APIView):
    """GET /api/v1/products/ — List products."""

    permission_classes = [IsStaff]

    def get(self, request):
        products = Product.objects.all().prefetch_related("variants_db").order_by("name")
        return Response(
            ProductSerializer(products, many=True).data,
            status=status.HTTP_200_OK,
        )


class ProductDetailView(APIView):
    """GET/PUT/DELETE /api/v1/products/<id>/ — Manage a product."""

    permission_classes = [IsStaff]

    def get(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ProductSerializer(product).data, status=status.HTTP_200_OK)

    def put(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Check if product is in use
        if product.quotations.exists() or product.subscriptions.exists():
            return Response(
                {"error": "Cannot delete product that is used in quotations or subscriptions."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductVariantListView(APIView):
    """POST /api/v1/products/<id>/variants/ — Add a variant to a product."""

    permission_classes = [IsStaff]

    def post(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response(
                {"error": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ProductVariantSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(product=product)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProductCreateView(APIView):
    """POST /api/v1/products/create/ — Create a new product."""

    permission_classes = [IsStaff]

    def post(self, request):
        serializer = ProductSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
