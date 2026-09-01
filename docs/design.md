# Tasty Bites Mobile POS — Design System

## 1. Purpose

Tasty Bites Mobile is a native tablet POS application for restaurant employees.

The application targets:

- iPad
- Android tablets
- 10–13 inch screens
- Landscape-first usage

The UI must be designed specifically for touch-based restaurant operations.

This is NOT a responsive version of the existing Tasty Bites website.

---

## 2. Design Sources

There are two different sources of truth.

### Existing Tasty Bites Web POS

Use the existing web application as the source of truth for:

- Business functionality
- Existing workflows
- API behavior
- Table states
- Order states
- Payment behavior
- Discount behavior
- Gift cards
- KOT
- Bar tickets
- Bills
- Printing
- Authentication
- Socket.IO behavior

Do not change existing business rules just to make the mobile UI easier.

### Google Stitch Designs

Use the approved Stitch designs as the visual and UX reference for:

- Layout
- Spacing
- Component hierarchy
- Tablet interaction
- Navigation
- Touch targets
- Visual hierarchy
- Screen composition

Do not blindly copy Stitch-generated business functionality.

If Stitch conflicts with the existing backend behavior, the backend/business rules win.

---

## 3. Overall Design Philosophy

The application should feel like:

- A professional restaurant POS
- Fast
- Operational
- Clean
- Premium
- Easy to use during busy service

It should NOT feel like:

- A SaaS dashboard
- A generic mobile app
- A desktop website squeezed into a tablet
- A banking application
- A highly decorative consumer application

---

## 4. Tablet First

Primary orientation:

Landscape.

Primary devices:

- iPad
- Android tablets

Target:

10–13 inch screens.

Important controls should generally have approximately 44–56px touch targets.

Never rely on:

- Hover
- Tiny buttons
- Tiny icons
- Mouse-only interactions

---

## 5. Navigation

Primary POS navigation should remain simple.

Main sections:

- Floor
- Orders

Do not create permanent navigation tabs for:

- Walking Order
- Staff Order
- Online Order
- Table Order
- Reports
- Print Jobs
- Notifications

Order types are contextual workflows.

Utilities should be accessible through the employee/profile menu.

---

## 6. Header

The global header should contain:

Left:

- Tasty Bites branding
- SALES POS indicator

Center:

- Floor
- Orders

Right:

- Current time
- Notifications
- Employee profile

The header must remain compact.

Do not allow the header to consume unnecessary tablet screen space.

---

## 7. Employee Profile Menu

Tapping the employee profile should open a compact menu.

Possible actions:

- EOD / Reports
- Print Jobs
- Notifications
- Day Close
- Logout

These are secondary utilities.

Do not permanently display these controls across the main header.

---

## 8. Colors

Primary:

- Tasty Bites Orange

Semantic colors:

- Available → neutral
- Serving → blue
- Payment → green
- Ordering → orange
- Combined → purple
- Booked → red
- Error → red
- Success → green
- Warning → amber

Do not rely on color alone.

Important states should also use:

- Text
- Icons
- Borders
- Shape
- Position

---

## 9. Typography

Prioritize readability.

Important hierarchy:

1. Screen title
2. Primary information
3. Status
4. Secondary information
5. Metadata

Avoid unnecessarily small text.

Numbers such as:

- Prices
- Totals
- Guest counts
- Order numbers

must remain highly readable.

---

## 10. Cards

Use:

- Moderate corner radius
- Subtle borders
- Minimal shadows

Avoid:

- Giant rounded cards
- Heavy shadows
- Excessive floating containers
- Excessive decorative elements

---

## 11. Floor Screen

The Floor screen is the primary screen after login.

The floor plan should be the main visual element.

It should show:

- Table number
- Table status
- Employee when relevant
- Guest count
- Seat count

Tables should be spatially positioned like a restaurant floor.

Do not convert the floor into a normal list or generic grid.

---

## 12. Floor Controls

The Floor screen should provide:

- Floor/area selector
- Lines/grid control
- New Order action

The floor selector should open a compact touch-friendly popover.

Example:

Main Hall Area
Outdoor
Bar
Private Dining

Actual data must come from the backend.

---

## 13. New Order

New Order should be a contextual action.

Possible order types:

- Table Order
- Walking Order
- Staff Order
- Online Order

Do not create separate top-level tabs for each order type.

All supported order types should eventually use the appropriate existing backend workflow.

---

## 14. Orders Screen

The Orders screen should use a tablet master-detail layout.

Left:

Order list.

Right:

Selected order details.

Do not use a narrow desktop-style drawer.

The selected order should remain visible while browsing orders.

---

## 15. Create Order Screen

Create Order should use:

Left/main:

- Categories
- Products

Right:

- Persistent cart

The cart should remain visible in landscape mode.

Product selection must be touch-friendly.

Simple products should require minimal taps.

Products with modifiers should open a touch-friendly modifier interface.

---

## 16. Payment Screen

Payment should feel like a dedicated payment workspace.

Do not use a desktop modal.

Keep visible:

- Order number
- Table/order context
- Amount due
- Payment method
- Payment state

Payment methods may include:

- Card
- Cash
- Gift Card

Actual payment behavior comes from the backend.

---

## 17. Scrolling

Avoid one giant page scroll.

Use independent scroll areas where appropriate.

Examples:

Create Order:

- Product list scrolls independently
- Cart scrolls independently
- Cart totals/actions remain visible

Orders:

- Order list scrolls
- Order details scroll
- Actions remain accessible

---

## 18. Loading States

Every API-driven screen should support:

- Initial loading
- Refresh/loading
- Empty state
- Error state

Loading states should be clear but not visually noisy.

---

## 19. Error States

Errors should:

- Explain what happened
- Give the user a useful next action
- Never expose technical stack traces

Example:

"Unable to load tables."

"Check your connection and try again."

---

## 20. Important Rule

Do not sacrifice usability to reproduce the existing web UI pixel-for-pixel.

The web application defines WHAT the POS does.

The mobile design defines HOW employees interact with it on a tablet.