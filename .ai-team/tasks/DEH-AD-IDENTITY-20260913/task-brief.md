# Task Brief

## Objective

Replace the former user-table unique value with `用户字典.AD账号` and make the AD account the sole business identity used by all user-linked records.

## Authoritative user clarification

- The user table previously used `用户ID` as its unique value.
- The user table now uses `AD账号` as its unique value.
- Whenever code needs the unique identifier from the user table, it must use `AD账号`.
- Fields such as `用户ID`, `申请人ID`, `接收人ID` and `创建用户ID` in other business tables keep their names but store the AD-account value.
- Feishu `open_id` and `user_id` remain transport/authentication identifiers only.
- Page refresh behavior is unchanged: read on entry and explicit query; no polling is required.

## Acceptance boundary

No visual redesign and no unrelated schema rename. Historical input may be read only through an explicit compatibility path; all primary lookups and new writes use AD account.
