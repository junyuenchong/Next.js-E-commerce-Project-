# Cart Authentication Requirements

## Overview

The e-commerce application now requires users to be authenticated before they can add items to their cart, view cart details, or perform any cart operations.

## Changes Made

### 1. Server-Side Authentication Checks

All cart-related server actions now check for user authentication:

- `addToCart()` - Requires authentication to add items
- `updateCartItem()` - Requires authentication to modify items
- `removeFromCart()` - Requires authentication to remove items
- `clearCart()` - Requires authentication to clear cart

### 2. Client-Side Authentication Handling

The `AddToCartButton` component now:
- Checks if the user is authenticated before attempting to add items
- Redirects unauthenticated users to the sign-in page with a return URL
- Handles authentication errors gracefully

### 3. Header Cart Authentication

The header cart functionality now:
- **For Authenticated Users**: Shows cart icon with item count and allows cart access
- **For Unauthenticated Users**: Shows cart icon with lock symbol (🔒) and redirects to login
- **Cart Sidebar**: Only renders for authenticated users, shows login prompt for others

### 4. User Experience Improvements

- **Product Page**: Shows a login reminder banner for unauthenticated users
- **Header Cart**: Visual lock indicator for unauthenticated users
- **Sign-In Page**: Handles return URLs to redirect users back to their original page after login
- **Visual Indicators**: Clear messaging about authentication requirements

## How It Works

### For Authenticated Users
1. Users can add items to cart normally
2. Cart operations work as expected
3. Cart persists across sessions
4. Header shows cart icon with item count
5. Cart sidebar displays cart contents

### For Unauthenticated Users
1. **Product Page**: Login reminder banner appears above "Add to Cart" button
2. **Add to Cart**: Redirects to sign-in page with return URL
3. **Header Cart**: Shows lock symbol, clicking redirects to login
4. **Cart Sidebar**: Shows "Login Required" message with sign-in button
5. After successful login, users are redirected back to their original page

## Implementation Details

### Authentication Check
```typescript
const { user } = await getCurrentSession();
if (!user) {
    throw new Error("Authentication required. Please login to add items to cart.");
}
```

### Header Cart Button
```typescript
{user ? (
  <button onClick={openCart} title="View Cart">
    <CartIcon />
    <span className="item-count">{getTotalItems()}</span>
  </button>
) : (
  <button onClick={handleCartClick} title="Login to view cart">
    <CartIcon />
    <span className="lock-symbol">🔒</span>
  </button>
)}
```

### Return URL Handling
```typescript
const returnUrl = encodeURIComponent(window.location.pathname);
router.push(`/user/auth/sign-in?returnUrl=${returnUrl}`);
```

### Cart Store Authentication
```typescript
checkAuth: async () => {
    const authenticated = await isAuthenticated();
    set({ isAuthenticated: authenticated });
    
    if (!authenticated) {
        set({ items: [], cartId: null, isLoaded: true, isOpen: false });
    }
}
```

### Visual Feedback
- Login reminder banner on product pages for unauthenticated users
- Lock symbol (🔒) on header cart for unauthenticated users
- Clear error messages when authentication is required
- Smooth redirect flow to sign-in page
- "Login Required" message in cart sidebar for unauthenticated users

## Benefits

1. **Security**: Prevents unauthorized cart manipulation
2. **User Experience**: Clear guidance on what users need to do
3. **Data Integrity**: Ensures cart data is properly associated with user accounts
4. **Conversion**: Encourages user registration and login
5. **Visual Clarity**: Users immediately understand authentication requirements

## Testing

To test the authentication requirements:

1. **Without Login (Unauthenticated User):**
   - Header cart shows lock symbol (🔒)
   - Clicking cart redirects to sign-in page
   - Product pages show login reminder banner
   - "Add to Cart" redirects to sign-in page
   - Cart sidebar shows "Login Required" message

2. **With Login (Authenticated User):**
   - Header cart shows item count
   - Cart sidebar displays cart contents
   - All cart operations work normally
   - No login reminders appear

3. **Return URL Flow:**
   - After login, user returns to original page
   - Cart functionality becomes available
   - Seamless user experience

4. **Cart Operations:**
   - All cart operations require authentication
   - Authentication errors redirect to login
   - Cart state is properly managed based on auth status 