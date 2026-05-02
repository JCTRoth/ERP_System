import { gql } from "@apollo/client";

// ── Product Queries ──
export const GET_PRODUCTS = gql`
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        name
        description
        sku
        price
        compareAtPrice
        stockQuantity
        status
        isFeatured
        slug
        category {
          id
          name
        }
        images {
          id
          url
          altText
          isPrimary
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_PRODUCT = gql`
  query GetProduct($id: UUID!) {
    product(id: $id) {
      id
      name
      description
      sku
      ean
      price
      compareAtPrice
      costPrice
      stockQuantity
      weight
      weightUnit
      status
      isFeatured
      isDigital
      slug
      metaTitle
      metaDescription
      category {
        id
        name
      }
      brand {
        id
        name
      }
      images {
        id
        url
        altText
        isPrimary
        sortOrder
      }
      variants {
        id
        name
        sku
        price
        stockQuantity
      }
      attributes {
        id
        name
        value
      }
    }
  }
`;

export const GET_FEATURED_PRODUCTS = gql`
  query GetFeaturedProducts($take: Int!) {
    featuredProducts(take: $take) {
      id
      name
      price
      compareAtPrice
      slug
      stockQuantity
      images {
        id
        url
        altText
        isPrimary
      }
    }
  }
`;

export const SEARCH_PRODUCTS = gql`
  query SearchProducts($searchTerm: String!) {
    searchProducts(searchTerm: $searchTerm) {
      id
      name
      price
      slug
      stockQuantity
      images {
        id
        url
        altText
        isPrimary
      }
    }
  }
`;

export const GET_PRODUCTS_BY_CATEGORY = gql`
  query GetProductsByCategory($categoryId: UUID!) {
    productsByCategory(categoryId: $categoryId) {
      id
      name
      price
      compareAtPrice
      slug
      stockQuantity
      images {
        id
        url
        altText
        isPrimary
      }
    }
  }
`;

// ── Category Queries ──
export const GET_CATEGORIES = gql`
  query GetCategories {
    rootCategories {
      id
      name
      description
      slug
      imageUrl
      subCategories {
        id
        name
        slug
      }
    }
  }
`;

export const GET_CATEGORY = gql`
  query GetCategory($id: UUID!) {
    category(id: $id) {
      id
      name
      description
      slug
      imageUrl
      subCategories {
        id
        name
        slug
      }
    }
  }
`;

// ── Cart Queries ──
export const GET_CART_BY_SESSION = gql`
  query GetCartBySession($sessionId: String!) {
    cartBySession(sessionId: $sessionId) {
      id
      sessionId
      subtotal
      taxAmount
      total
      couponCode
      discountAmount
      items {
        id
        productId
        product {
          name
          images {
            url
            isPrimary
          }
        }
        variantId
        variant {
          name
        }
        quantity
        unitPrice
        total
      }
    }
  }
`;

// ── Shipping Queries ──
export const GET_SHIPPING_METHODS = gql`
  query GetAvailableShipping($orderTotal: Decimal!, $country: String) {
    availableShippingMethods(orderTotal: $orderTotal, country: $country) {
      id
      name
      description
      price
      estimatedDeliveryDays
    }
  }
`;
