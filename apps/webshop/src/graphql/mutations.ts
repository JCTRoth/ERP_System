import { gql } from "@apollo/client";

// Cart item fragment for consistent fields
const CART_FIELDS = `
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
`;

// ── Cart Mutations ──
export const ADD_TO_CART = gql`
  mutation AddToCart($input: AddToCartInput!) {
    addToCart(input: $input) {
      ${CART_FIELDS}
    }
  }
`;

export const UPDATE_CART_ITEM = gql`
  mutation UpdateCartItem($input: UpdateCartItemInput!) {
    updateCartItem(input: $input) {
      ${CART_FIELDS}
    }
  }
`;

export const REMOVE_CART_ITEM = gql`
  mutation RemoveCartItem($cartItemId: UUID!) {
    removeCartItem(cartItemId: $cartItemId) {
      ${CART_FIELDS}
    }
  }
`;

export const APPLY_COUPON = gql`
  mutation ApplyCoupon($input: ApplyCouponInput!) {
    applyCouponToCart(input: $input) {
      ${CART_FIELDS}
    }
  }
`;

export const REMOVE_COUPON = gql`
  mutation RemoveCoupon($cartId: UUID!) {
    removeCouponFromCart(cartId: $cartId) {
      id
      couponCode
      discountAmount
      subtotal
      total
    }
  }
`;

export const CLEAR_CART = gql`
  mutation ClearCart($cartId: UUID!) {
    clearCart(cartId: $cartId)
  }
`;

// ── Order Mutations ──
export const CREATE_ORDER = gql`
  mutation CreateShopOrder($input: ShopCreateOrderInput!) {
    createShopOrder(input: $input) {
      id
      orderNumber
      status
      subtotal
      taxAmount
      shippingAmount
      totalAmount
      shippingName
      shippingAddress
      shippingCity
      shippingPostalCode
      shippingCountry
      shippingPhone
      items {
        id
        productName
        productSku
        quantity
        unitPrice
        total
      }
    }
  }
`;

// ── Payment Mutations ──
export const CREATE_PAYMENT = gql`
  mutation CreatePayment($input: CreatePaymentInput!) {
    createPayment(input: $input) {
      id
      amount
      status
      method
    }
  }
`;
