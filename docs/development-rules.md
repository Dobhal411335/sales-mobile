# Tasty Bites Mobile — Development Rules

## 1. Technology

Use:

- React Native
- TypeScript
- React Navigation
- Zustand
- Axios
- Socket.IO Client when realtime functionality is implemented

---

## 2. TypeScript

Use TypeScript for all application code.

Prefer:

- Interfaces
- Types
- Explicit function parameters
- Typed API responses

Avoid:

- any
- @ts-ignore
- unnecessary type assertions

If TypeScript reports an error, fix the underlying problem.

---

## 3. Components

Keep components reasonably small.

Screens should compose components rather than contain the entire UI.

Example:

FloorScreen
    ↓
FloorToolbar
TableCard
FloorSelector

Do not create abstractions just for the sake of abstraction.

---

## 4. Styling

Keep styling close to the component unless a style is genuinely shared.

Use the shared design constants for:

- Colors
- Common spacing
- Typography decisions

Do not introduce a large design-system framework unless there is a concrete need.

---

## 5. Naming

Use clear names.

Screens:

FloorScreen.tsx
CreateOrderScreen.tsx
PaymentScreen.tsx

Components:

TableCard.tsx
ProductCard.tsx
OrderCard.tsx

Services:

tableService.ts
orderService.ts

Stores:

authStore.ts
cartStore.ts

---

## 6. Business Logic

Never put important business rules only inside UI components.

Backend remains the source of truth.

---

## 7. Existing Web Project

The existing web project can be inspected for reference.

It should NOT be modified while working on the mobile application unless explicitly requested.

Use it to understand:

- Existing functionality
- API calls
- Data structures
- Business rules
- Socket events
- Printing behavior

Do not copy desktop CSS directly into React Native.

---

## 8. Design Implementation

The approved Stitch design is the visual reference.

When implementing a screen:

1. Understand the Stitch design.
2. Check the existing web functionality.
3. Map the functionality into the tablet design.
4. Implement using React Native components.
5. Test touch interaction.
6. Test different tablet dimensions.

---

## 9. Tablet First

Do not optimize the application around a phone layout.

The primary target is landscape tablet.

Important controls should be easy to operate while standing.

---

## 10. Dependencies

Do not install packages without a clear reason.

Before adding a dependency:

- Explain why it is needed.
- Check whether React Native already provides the required capability.
- Prefer established packages.

---

## 11. Do Not Overengineer

Do not introduce:

- Repository patterns
- Dependency injection
- Complex domain layers
- Excessive factories
- Excessive abstractions

unless the project actually requires them.

Simple code is preferred.

---

## 12. Before Finishing a Task

After implementing a feature:

1. Run TypeScript checks.
2. Run linting if configured.
3. Run the application.
4. Test the affected workflow.
5. Fix errors introduced by the implementation.
6. Report what changed.

Do not move to the next major feature until the current feature works.