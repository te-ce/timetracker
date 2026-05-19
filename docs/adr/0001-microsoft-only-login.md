# ADR 0001: Microsoft-only Login (Firebase Auth + Graph API)

## Status
Accepted

## Context
The app requires two external services:
1. **Firebase Firestore** — persistence for time entries and configuration
2. **Microsoft Graph API** — read and write the Excel file in SharePoint

Firebase Auth supports Microsoft as an OAuth provider and returns the Microsoft Access Token. Since the Excel file always lives in SharePoint, the user is guaranteed to have a Microsoft Work/School account.

## Decision
The only supported login provider is **Microsoft (Work/School account)** via Firebase Auth with the Microsoft provider.

The Microsoft Access Token obtained from the Firebase Auth login is used directly for Microsoft Graph API calls (SharePoint Excel). No separate login flow is required.

## Consequences
- ✅ A single login covers both Firebase Auth and SharePoint access
- ✅ No double authentication flow for the user
- ✅ Fits the target audience (enterprise environment, SharePoint users)
- ❌ No Google/Apple login — users without a Microsoft account cannot use the app
- ❌ Microsoft Access Token expiry must be handled (token refresh via Firebase)
