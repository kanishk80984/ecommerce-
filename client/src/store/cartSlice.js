import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [], // Array of { product_id, quantity, name, price, offer_price, thumbnail }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      const vId = item.variant_id || 0;
      const cartItemId = item.cart_id || `${item.product_id}-${vId}`;
      const existing = state.items.find(i => i.product_id === item.product_id && (i.variant_id || 0) === vId);
      if (existing) {
        existing.quantity += item.quantity || 1;
      } else {
        state.items.push({ ...item, quantity: item.quantity || 1, cartItemId, variant_id: vId });
      }
    },
    setCart: (state, action) => {
      state.items = action.payload.map(item => ({
        ...item,
        cartItemId: item.cart_id || `${item.product_id}-${item.variant_id || 0}`
      }));
    },
    clearCart: (state) => {
      state.items = [];
    },
    updateQuantity: (state, action) => {
      const { id, quantity, variantId } = action.payload;
      const vId = variantId || 0;
      const item = state.items.find(i => i.cartItemId === id || (i.product_id === id && (i.variant_id || 0) === vId) || i.id === id);
      if (item) {
        item.quantity = quantity;
      }
    },
    removeFromCart: (state, action) => {
      // action.payload can be an object { id, variantId } or just id
      let id, vId;
      if (typeof action.payload === 'object' && action.payload !== null) {
        id = action.payload.id;
        vId = action.payload.variantId || 0;
      } else {
        id = action.payload;
        vId = 0; // fallback if variant not provided
      }
      state.items = state.items.filter(i => !(i.cartItemId === id || (i.product_id === id && (i.variant_id || 0) === vId) || i.id === id));
    }
  },
  extraReducers: (builder) => {
    builder.addCase('auth/logout', (state) => {
      state.items = [];
    });
  }
});

export const { addToCart, setCart, clearCart, updateQuantity, removeFromCart } = cartSlice.actions;
export default cartSlice.reducer;
