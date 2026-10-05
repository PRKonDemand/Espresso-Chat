# Espresso --- Master Product & Technical Specification

**Version:** 1.0\
**Status:** Product foundation / Source of Truth\
**Product:** Espresso\
**Repository:** GitHub\
**Deployment:** Vercel\
**Backend:** Supabase

> This document is the canonical specification for Espresso. Future
> developers or AI agents must read it before implementing, changing, or
> adding features. If this document conflicts with an old conversation,
> use the latest explicit product decision and update this document.

------------------------------------------------------------------------

# 1. Product Vision

Espresso is a real-time messaging application focused on **fast,
reliable, clean communication**.

The product should feel: - Instant - Smooth - Premium - Familiar -
Human-designed - Simple rather than overloaded

Espresso is **not** intended to become a complicated social network or
full video-editing-style application. The initial product focuses on
excellent messaging and a small set of useful communication features.

The main technical/product differentiator is the perception and actual
performance of sending and receiving messages quickly.

------------------------------------------------------------------------

# 2. Confirmed Product Features

## 2.1 Account Creation

A user can create an Espresso account with:

-   Email address
-   Name
-   Unique User ID
-   Password

After successful registration, Espresso generates a unique numeric
**Recovery Code**.

The user should be clearly instructed to save this code securely.

The recovery system is intended to support password recovery/reset.

### Security rule

The recovery code must not be treated like ordinary profile data or
exposed in normal profile queries. The implementation must use a secure
verification mechanism and must not store sensitive recovery credentials
as casually readable plaintext.

------------------------------------------------------------------------

# 3. Authentication

Authentication should use Supabase Auth.

Required flows:

-   Sign up
-   Sign in
-   Sign out
-   Session persistence
-   Password change
-   Password recovery
-   Account recovery using the Espresso recovery mechanism

The frontend must never contain a Supabase service-role/secret key.

Authorization must be enforced server-side/database-side, not only
through UI checks.

------------------------------------------------------------------------

# 4. User Identity

Each account has:

-   Internal immutable user UUID
-   Public unique Espresso User ID
-   Display name
-   Email
-   Optional profile/avatar information
-   Created/updated timestamps

The **User ID** is the primary public identifier for finding another
person.

User ID uniqueness must be enforced by the database.

------------------------------------------------------------------------

# 5. Finding and Starting a Chat

Main flow:

``` text
Search
   ↓
Enter User ID
   ↓
Find user
   ↓
Open profile/result
   ↓
Start/Open chat
```

Search should be simple and fast.

The app should not expose unnecessary private account information during
search.

------------------------------------------------------------------------

# 6. Real-Time Messaging

Espresso supports live text messaging.

Required behavior:

-   Send text
-   Receive text in real time
-   Message timestamps
-   Conversation history
-   New-message UI updates
-   Failed-send handling
-   Appropriate loading states
-   Optimistic rendering where safe

### Performance principle

The normal text-message path should be as short as possible:

``` text
User
  ↓
Composer
  ↓
Optimistic UI
  ↓
Supabase/PostgreSQL
  ↓
Realtime event
  ↓
Other participant
```

Do not implement polling as the primary messaging mechanism.

Use Supabase Realtime subscriptions for live updates.

------------------------------------------------------------------------

# 7. Live Typing Indicator

Espresso supports a live typing indicator.

Example:

``` text
Alex is typing...
```

Expected behavior:

-   Appears when another participant starts typing.
-   Updates live.
-   Disappears after typing stops.
-   Disappears when the user sends the message.
-   Disappears when the user leaves the conversation.
-   Does not create a database row for every keystroke.

Typing state is **ephemeral**.

It should use an appropriate Realtime/presence/broadcast mechanism
rather than permanent message storage.

Typing events must be debounced/throttled to prevent unnecessary network
traffic.

The UI should feel subtle and responsive rather than distracting.

------------------------------------------------------------------------

# 8. Swipe-to-Reply

A user can swipe a message to initiate a reply.

Flow:

``` text
Message
  ↓
Swipe gesture
  ↓
Reply mode
  ↓
Referenced message preview above composer
  ↓
User types response
  ↓
Send
```

The new message should contain:

`reply_to_message_id`

It should not duplicate the complete original message.

The chat UI should visually connect the reply to the referenced message.

On desktop, equivalent interaction can be provided through a reply
action/button/context menu because swipe is primarily a touch
interaction.

------------------------------------------------------------------------

# 9. Image Messaging

Users can send images.

Required behavior:

1.  Select/capture image.
2.  Compress on the client.
3.  Resize when appropriate.
4.  Convert to an efficient format when practical.
5.  Upload to Supabase Storage.
6.  Create the message metadata/reference.
7.  Display the image in chat.

### Important architecture rule

Do not store image binaries directly inside PostgreSQL message rows.

Use:

``` text
Image
  ↓
Client compression
  ↓
Supabase Storage
  ↓
Storage reference/metadata
  ↓
Message row
```

Compression should reduce: - Data usage - Upload time - Storage usage -
Bandwidth - Backend load

The original image should not automatically be uploaded if the product
does not require preservation of the original.

------------------------------------------------------------------------

# 10. Location Sharing

A user can send their current location in a chat.

Possible message metadata:

-   Latitude
-   Longitude
-   Timestamp
-   Optional human-readable label

The location should appear as a compact location card in the
conversation.

The browser/device must request location permission explicitly.

Espresso must not continuously track location unless a future feature
specifically defines this.

------------------------------------------------------------------------

# 11. Delete Chat

Users can remove a chat from their own chat list.

Important distinction:

### Delete Chat

Means:

> Remove/hide the conversation from this user's chat list.

It does **not automatically mean**:

> Destroy the other participant's conversation history.

Global message deletion must be treated as a separate future product
decision.

The implementation should support user-specific chat visibility/deletion
state where appropriate.

------------------------------------------------------------------------

# 12. Blocking

A user can block another user.

When User A blocks User B:

-   B cannot send new messages to A.
-   A does not receive new messages from B.
-   The restriction must be enforced server-side.
-   UI-only blocking is not sufficient.
-   Existing conversation data should not automatically be destroyed.
-   The blocked state should be clearly represented in the UI.

If an unblock feature is later added, it must update the same
relationship model.

Blocking rules must be enforced through database authorization/RLS
and/or trusted server-side logic.

------------------------------------------------------------------------

# 13. Chat Data Model

The initial conceptual model is:

``` text
profiles
├── id
├── user_id
├── name
├── email/reference
├── avatar
├── created_at
└── updated_at

chats
├── id
├── created_at
└── updated_at

chat_members
├── chat_id
├── user_id
├── deleted/hidden state
└── created_at

messages
├── id
├── chat_id
├── sender_id
├── type
├── content
├── image/storage reference
├── location latitude
├── location longitude
├── reply_to_message_id
├── created_at
└── status/metadata as required

blocks
├── blocker_id
├── blocked_id
└── created_at
```

The exact schema may evolve during implementation, but the access model
must remain secure.

Recommended indexes should exist for common queries such as: - Messages
by chat and time - Chat membership by user - Public User ID lookup -
Block relationships

------------------------------------------------------------------------

# 14. Security Rules

Security is a first-class requirement.

## Supabase

-   Enable Row Level Security on exposed application tables.
-   Users can only access data they are authorized to access.
-   Chat members can access only conversations they belong to.
-   Blocked relationships must be respected server-side.
-   Users cannot modify another user's profile ownership fields.
-   Service-role/secret keys must never be shipped to the browser.
-   Storage buckets/policies must restrict unauthorized access where
    private media is used.

Do not rely on:

``` text
if (blocked) hide button
```

as security.

Instead:

``` text
UI check
+
Server/database authorization
```

must both exist.

------------------------------------------------------------------------

# 15. UI/UX Direction

The UI is a major part of Espresso.

It must **not look like a generic AI-generated dashboard**.

Avoid: - Excessive gradients - Random glassmorphism everywhere -
Unnecessary glowing effects - Overly rounded cards everywhere - Huge
decorative headings - Generic template/dashboard appearance - Excessive
animations - Visually noisy layouts

The interface should look intentionally designed by a professional
product/UI designer.

------------------------------------------------------------------------

# 16. UI Inspiration

The main visual inspiration is:

### Telegram

Use as inspiration for: - Messaging layout - Chat list - Conversation
navigation - Search - Message density - Familiar messaging
interactions - Desktop + mobile behavior

### Apple iMessage

Use as inspiration for: - Premium simplicity - Message bubbles -
Conversation hierarchy - Micro-interactions - Media presentation - Reply
interactions - Clean spacing - Native-feeling mobile experience

### AI assistant interfaces

Use as inspiration where appropriate for: - Clean modern interaction
patterns - Minimal controls - Smart empty states - Thoughtful loading
states - Clear information hierarchy

**Important:** Espresso must not be a visual clone of Telegram,
iMessage, or any other product. Inspiration means learning from
interaction quality and design principles, then creating an original
Espresso visual identity.

------------------------------------------------------------------------

# 17. Responsive Design

Espresso must work properly on:

-   Mobile phones
-   Tablets
-   Laptops
-   Desktop monitors
-   Large desktop displays

The design must be responsive rather than simply scaling one fixed
desktop layout down.

## Mobile

The mobile experience should prioritize:

``` text
Chat list
    ↓
Conversation
    ↓
Composer
```

Navigation should feel natural for touch.

Swipe-to-reply should work smoothly.

Buttons and interactive areas must have appropriate touch targets.

## Desktop

Desktop can use a multi-column messaging layout:

``` text
┌──────────────┬──────────────────────────────┐
│ Chat List    │ Current Conversation         │
│              │                              │
│ Search       │ Messages                     │
│ Chats        │                              │
│              │                              │
│              │ Composer                     │
└──────────────┴──────────────────────────────┘
```

A third information/profile panel should only be introduced if it
genuinely improves the product.

Do not add panels simply because there is empty screen space.

------------------------------------------------------------------------

# 18. UI Architecture

UI code must be easy to locate and modify.

Do not create one enormous component containing the entire application.

Recommended structure:

``` text
components/
├── ui/
│   ├── Button
│   ├── Input
│   ├── Modal
│   ├── Avatar
│   └── ...
│
├── chat/
│   ├── ChatList
│   ├── ChatHeader
│   ├── MessageList
│   ├── MessageBubble
│   ├── MessageComposer
│   ├── TypingIndicator
│   ├── ReplyPreview
│   ├── ImageMessage
│   └── LocationMessage
│
├── auth/
│   ├── LoginForm
│   ├── SignupForm
│   └── RecoveryForm
│
└── settings/
    └── ...
```

Feature-specific logic should live separately:

``` text
features/
├── messaging/
├── typing-indicator/
├── swipe-to-reply/
├── image-sharing/
├── location-sharing/
├── blocking/
├── user-search/
└── authentication/
```

This means a future developer can locate a feature quickly.

------------------------------------------------------------------------

# 19. Styling Organization

Keep global and feature-specific styling separated.

Example:

``` text
styles/
├── globals.css
├── theme.css
├── chat.css
├── auth.css
├── settings.css
└── responsive.css
```

Where practical, component-local styles should remain close to the
component.

The visual design system should define reusable: - Typography -
Spacing - Border radius - Shadows - Colors - Message bubble styles -
Interactive states - Breakpoints - Motion timing

Changing the main visual identity should require editing a small number
of centralized theme/design files rather than searching the entire
codebase.

------------------------------------------------------------------------

# 20. Design System Philosophy

Espresso should have an identifiable visual identity.

The design should communicate:

**Fast + calm + premium + friendly.**

Use motion carefully: - Message appearance - Reply interaction - Typing
indicator - Image loading - Navigation - Modal transitions

Animations should generally be short and purposeful.

Avoid animation that delays the user's ability to communicate.

------------------------------------------------------------------------

# 21. Chat Interaction Details

A message can expose actions such as:

-   Reply
-   Copy text
-   Delete/remove where permitted
-   Additional actions when future features require them

On mobile, actions can be presented through: - Swipe gestures - Long
press - Bottom sheet/context action UI

On desktop: - Hover actions - Context menu - Keyboard-accessible
controls

Do not make essential actions accessible only through hover.

------------------------------------------------------------------------

# 22. Accessibility

Espresso should support:

-   Keyboard navigation
-   Visible focus states
-   Semantic buttons/controls
-   Screen-reader-friendly labels
-   Sufficient contrast
-   Reduced-motion preference
-   Accessible form errors
-   Clear loading/error states

Accessibility should be considered while building components, not added
at the end.

------------------------------------------------------------------------

# 23. Error Handling

The app must handle:

-   Failed message sends
-   Network disconnects
-   Realtime disconnects
-   Image upload failures
-   Authentication failures
-   Expired sessions
-   Location permission denial
-   Blocked-user conflicts
-   Duplicate/invalid User IDs

Errors should be understandable to normal users.

Avoid exposing raw database/server errors directly in the UI.

------------------------------------------------------------------------

# 24. Offline / Poor Network Behavior

The initial product does not need to become a full offline-first
messenger.

However, it should handle temporary connectivity problems gracefully.

Recommended behavior: - Show connection state when meaningful. - Keep
unsent message text available. - Clearly distinguish sending/sent/failed
states. - Retry safely where possible. - Reconnect Realtime
subscriptions when connectivity returns.

Never silently discard user-entered message content.

------------------------------------------------------------------------

# 25. Performance Rules

Every new feature must be reviewed for performance.

Before adding a feature ask:

1.  Does it create unnecessary database writes?
2.  Does it create unnecessary realtime events?
3.  Can it be handled client-side?
4.  Can the payload be smaller?
5.  Is there an appropriate database index?
6.  Does it cause unnecessary React re-renders?
7.  Does it affect mobile data usage?
8.  Does it create unnecessary storage usage?

Typing indicators are the canonical example of an ephemeral event that
should not become a database record per keystroke.

------------------------------------------------------------------------

# 26. GitHub Project Organization

GitHub is the source repository.

Recommended top-level structure:

``` text
/app
/components
/features
/lib
/styles
/types
/supabase
/docs
/tests
```

The `docs/` folder should contain the product and technical
documentation.

At minimum:

``` text
docs/
├── ESPRESSO_SPEC.md
├── DATABASE.md
├── SECURITY.md
├── FEATURES.md
└── UI_GUIDELINES.md
```

This master document should be kept synchronized with major product
decisions.

------------------------------------------------------------------------

# 27. Future Feature Protocol

When adding a new feature, do not randomly place code into an existing
giant file.

Use this process:

``` text
1. Define feature
2. Update ESPRESSO_SPEC.md
3. Create feature folder/module
4. Create UI component(s)
5. Create database migration if required
6. Add RLS/security rules if required
7. Add tests
8. Integrate into existing UI
9. Verify mobile + desktop
10. Update documentation
```

A new feature should be independently understandable.

Example:

``` text
features/new-feature/
├── components/
├── hooks/
├── services/
├── types/
└── index.ts
```

Only use the parts that are actually needed; do not create meaningless
files just for structure.

------------------------------------------------------------------------

# 28. Database Change Protocol

For any database feature:

``` text
Feature requirement
       ↓
Schema design
       ↓
Migration
       ↓
Indexes
       ↓
RLS policies
       ↓
Application integration
       ↓
Testing
       ↓
Documentation
```

Every exposed table must have an intentional authorization model.

Never create a table first and "add security later."

------------------------------------------------------------------------

# 29. Realtime Feature Protocol

For any realtime feature determine whether it is:

### Persistent

Examples: - Messages - Chat membership - Blocks

These belong in the database.

### Ephemeral

Examples: - Typing indicator - Temporary presence signals

These should use Realtime mechanisms and should not be persisted
unnecessarily.

This distinction is important for Espresso's speed and database
efficiency.

------------------------------------------------------------------------

# 30. Media Storage Protocol

All future media features should answer:

-   Is the media compressed?
-   Where is it stored?
-   Who can access it?
-   How long is it retained?
-   Is the database storing metadata or actual binary data?
-   What happens if upload fails?
-   What happens if the user loses connection?

The default architecture for images is:

``` text
Client
 ↓
Compress
 ↓
Upload
 ↓
Storage
 ↓
Message metadata
```

------------------------------------------------------------------------

# 31. Testing Requirements

Before considering a feature complete, test:

## Authentication

-   Signup
-   Login
-   Logout
-   Password recovery
-   Invalid credentials

## Messaging

-   Send
-   Receive
-   Realtime update
-   Failed send
-   Reconnect

## Typing

-   Indicator appears
-   Indicator disappears
-   Multiple participants behave correctly
-   No excessive network activity

## Reply

-   Swipe works on touch
-   Desktop reply action works
-   Reply preview works
-   Correct referenced message is stored/rendered

## Images

-   Compression works
-   Upload works
-   Failed upload is handled
-   Image displays correctly on mobile and desktop

## Location

-   Permission granted
-   Permission denied
-   Location message renders correctly

## Blocking

-   Blocked user cannot send
-   Server-side restriction works
-   UI reflects state

## Responsive UI

-   Mobile
-   Tablet
-   Desktop
-   Large screen

------------------------------------------------------------------------

# 32. Visual Quality Standard

Before release, the UI should be reviewed for:

-   Alignment
-   Spacing
-   Typography
-   Consistency
-   Loading states
-   Empty states
-   Error states
-   Touch behavior
-   Keyboard behavior
-   Animation smoothness
-   Dark/light appearance if implemented
-   Desktop responsiveness
-   Mobile responsiveness

The final result should feel like a deliberately designed consumer
messaging product, not a generated admin dashboard.

------------------------------------------------------------------------

# 33. What Must NOT Be Added Automatically

Do not add features simply because they are common in other messaging
apps.

Examples that require explicit product approval:

-   Stories
-   Channels
-   Public groups
-   Voice calls
-   Video calls
-   Status updates
-   Payments
-   Public profiles
-   Complex reactions
-   AI chatbot features
-   Advertising
-   Social feeds
-   Unnecessary gamification

Espresso should remain focused until a feature is intentionally
approved.

------------------------------------------------------------------------

# 34. Current Feature Baseline

The currently approved feature set is:

``` text
[✓] Account creation
[✓] Email
[✓] Name
[✓] Unique User ID
[✓] Password
[✓] Numeric recovery code
[✓] Login
[✓] Password recovery/reset
[✓] User ID search
[✓] Start/open chat
[✓] Real-time text messaging
[✓] Live typing indicator
[✓] Swipe-to-reply
[✓] Image messaging
[✓] Client-side image compression
[✓] Location sharing
[✓] Delete/remove chat
[✓] Block user
[✓] Basic settings
[✓] Responsive mobile UI
[✓] Responsive desktop UI
[✓] Telegram-inspired messaging UX
[✓] iMessage-inspired premium simplicity
[✓] Modern AI-interface-inspired cleanliness
[✓] Modular UI architecture
[✓] Modular feature architecture
[✓] GitHub
[✓] Supabase
[✓] Vercel
```

------------------------------------------------------------------------

# 35. Future AI Handoff Instructions

If this project is handed to another AI, the AI must:

1.  Read this entire document first.
2.  Treat it as the current product specification.
3.  Do not remove an approved feature without explicit instruction.
4.  Do not invent major product decisions silently.
5.  Preserve the modular repository structure.
6.  Keep UI code easy to locate and modify.
7.  Keep Supabase security/RLS requirements intact.
8.  Prefer Realtime for realtime behavior.
9.  Avoid unnecessary database writes.
10. Update this document when a major feature or architecture decision
    changes.
11. Before implementing Supabase changes, verify current Supabase
    documentation because APIs and platform behavior can change.
12. Test changes instead of assuming they work.
13. Verify responsive behavior on both mobile and desktop.
14. Do not turn Espresso into a clone of Telegram or iMessage; use them
    only as UX/design inspiration.

------------------------------------------------------------------------

# 36. Product Decision Log

Major decisions should be recorded here.

  -----------------------------------------------------------------------
  Version                             Decision
  ----------------------------------- -----------------------------------
  1.0                                 Espresso is a fast real-time
                                      messaging application.

  1.0                                 GitHub + Supabase + Vercel are the
                                      core infrastructure.

  1.0                                 User registration uses email, name,
                                      User ID and password.

  1.0                                 Numeric recovery code is part of
                                      account recovery.

  1.0                                 Text, images and location are
                                      supported message types.

  1.0                                 Images are compressed before
                                      upload.

  1.0                                 Typing indicator is
                                      realtime/ephemeral.

  1.0                                 Swipe-to-reply is supported.

  1.0                                 Users can remove chats from their
                                      own chat list.

  1.0                                 Users can block other users and
                                      blocking is server-enforced.

  1.0                                 UI takes inspiration from Telegram
                                      and iMessage, with modern
                                      AI-interface cleanliness.

  1.0                                 UI and features must be modular and
                                      easy to change independently.

  1.0                                 Desktop and mobile are first-class
                                      experiences.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 37. Definition of Done

A feature is not "done" merely because it appears on screen.

A feature is complete only when:

``` text
Requirement
   ↓
UI
   ↓
Application logic
   ↓
Database/backend if needed
   ↓
Security
   ↓
Realtime behavior if needed
   ↓
Error handling
   ↓
Mobile testing
   ↓
Desktop testing
   ↓
Documentation
```

All relevant stages must be completed.

------------------------------------------------------------------------

# 38. Final Product Principle

**Espresso should feel fast before the user has time to think about
speed.**

The product should combine:

-   Telegram's strong messaging usability
-   iMessage's polished simplicity
-   Modern AI-product cleanliness
-   Espresso's own visual identity
-   Strong realtime architecture
-   Sensible data usage
-   Secure backend authorization
-   Modular engineering

The objective is not to build the largest messaging platform.

The objective is to build a **beautiful, fast, reliable, focused
messaging experience** that can grow feature-by-feature without becoming
difficult to maintain.
