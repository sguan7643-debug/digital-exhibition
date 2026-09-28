# Task Brief

## Goal

Restore a reliable Web entry to “我的申请”, make the application-detail timeline readable, and remove the no-longer-required Feishu authorization button from the application form.

## User

An already authorized POC user who submits and follows an application onboarding request.

## Mode and Platform

Existing Vue Web project. Web only; mobile is not declared.

## Evidence

- Personal-center screenshot: the red “我的申请” text link navigates correctly, while the blue outlined “我的申请” shortcut card does not.
- Application-detail screenshot: the connector line visibly crosses the “提交申请” stage title.
- Application-form screenshot: the user explicitly requested that the “飞书授权” button no longer be displayed.

## Scope

- Correct the shortcut-card route and enabled state so it reaches the same destination as the existing working text link.
- Preserve the working text-link behavior.
- Correct the detail-page timeline layout so the connector never overlaps stage text.
- Remove the authorization button from the application form without modifying authorization, approval, or data-write behavior.
- Validate these paths in the local Web application, including an empty-list state and a real existing request detail.

## Out of Scope

- OAuth session persistence or callback changes.
- Approval configuration, Base table writes, upload workflow, or data creation.
- Other personal-center entries, Material Center, mobile behavior, or deployment.

## Success Metric

Both visible “我的申请” entry points open the same page; the details timeline is readable; the application form has no authorization button; the existing onboarding submission/status flow remains available.

## Risk

Medium. A route or visibility change must not interfere with current authorization and approval paths.

## Dependencies

- Existing local Vue routes and personal-center feed data.
- At least one existing application request for detail-page visual verification.
