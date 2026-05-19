import { createContext, useContext, ReactNode, useCallback } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { GET_CART_BY_SESSION } from "../graphql/queries";
import { ADD_TO_CART, UPDATE_CART_ITEM, REMOVE_CART_ITEM, CLEAR_CART, APPLY_COUPON, REMOVE_COUPON } from "../graphql/mutations";
import { getSessionId } from "../lib/utils";
import toast from "react-hot-toast";
import { useI18n } from "./I18nContext";

export interface CartItem {
  id: string;
  productId: string;
  product?: {
    name: string;
    images?: { url: string; isPrimary: boolean }[];
  };
  variantId?: string;
  variant?: {
    name: string;
  };
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Cart {
  id: string;
  sessionId: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  couponCode?: string;
  discountAmount?: number;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: unknown;
  itemCount: number;
  addToCart: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  refetchCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const sessionId = getSessionId();
  const { t } = useI18n();

  const { data, loading, error, refetch } = useQuery(GET_CART_BY_SESSION, {
    variables: { sessionId },
    fetchPolicy: "cache-and-network",
  });

  const cart: Cart | null = data?.cartBySession ?? null;
  const itemCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  const [addToCartMutation] = useMutation(ADD_TO_CART);
  const [updateCartItemMutation] = useMutation(UPDATE_CART_ITEM);
  const [removeCartItemMutation] = useMutation(REMOVE_CART_ITEM);
  const [clearCartMutation] = useMutation(CLEAR_CART);
  const [applyCouponMutation] = useMutation(APPLY_COUPON);
  const [removeCouponMutation] = useMutation(REMOVE_COUPON);

  const addToCart = useCallback(
    async (productId: string, quantity: number, variantId?: string) => {
      await addToCartMutation({
        variables: {
          input: { sessionId, productId, variantId, quantity },
        },
      });
      refetch();
      toast.success(t("cart.added"));
    },
    [addToCartMutation, refetch, sessionId, t]
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      await updateCartItemMutation({
        variables: { input: { cartItemId, quantity } },
      });
      refetch();
    },
    [updateCartItemMutation, refetch]
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      await removeCartItemMutation({ variables: { cartItemId } });
      refetch();
    },
    [removeCartItemMutation, refetch]
  );

  const clearCartFn = useCallback(async () => {
    if (!cart) return;
    await clearCartMutation({ variables: { cartId: cart.id } });
    refetch();
  }, [clearCartMutation, cart, refetch]);

  const applyCouponFn = useCallback(
    async (code: string) => {
      if (!cart) return;
      await applyCouponMutation({
        variables: { input: { cartId: cart.id, couponCode: code } },
      });
      refetch();
      toast.success(t("cart.couponApplied"));
    },
    [applyCouponMutation, cart, refetch, t]
  );

  const removeCouponFn = useCallback(async () => {
    if (!cart) return;
    await removeCouponMutation({ variables: { cartId: cart.id } });
    refetch();
  }, [removeCouponMutation, cart, refetch]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        error,
        itemCount,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart: clearCartFn,
        applyCoupon: applyCouponFn,
        removeCoupon: removeCouponFn,
        refetchCart: refetch,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
