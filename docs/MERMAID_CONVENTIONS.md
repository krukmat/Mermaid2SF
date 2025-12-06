# Mermaid Flow Conventions Guide

## Overview

This guide describes the conventions for writing Mermaid flowcharts that compile to Salesforce Flow metadata.

## Node Types and Shapes

### Start Element
**Shape**: Stadium `([...])`
**Prefix**: `START:`

```mermaid
Start([START: Flow Begins])
```

### End Element
**Shape**: Stadium `([...])`
**Prefix**: `END:`

```mermaid
End([END: Flow Completes])
```

### Assignment Element
**Shape**: Rectangle `[...]`
**Prefix**: `ASSIGNMENT:`

```mermaid
Assign[ASSIGNMENT: Set Variables]
```

### Decision Element
**Shape**: Diamond `{...}`
**Prefix**: `DECISION:`

```mermaid
Decision{DECISION: Check Condition}
```

### Screen Element
**Shape**: Rectangle `[...]`
**Prefix**: `SCREEN:`

```mermaid
Screen[SCREEN: User Input]
```

### RecordCreate Element
**Shape**: Rectangle `[...]`
**Prefix**: `CREATE:`

```mermaid
Create[CREATE: Create Account]
```

### RecordUpdate Element
**Shape**: Rectangle `[...]`
**Prefix**: `UPDATE:`

```mermaid
Update[UPDATE: Update Status]
```

### Subflow Element
**Shape**: Subroutine `[[...]]`
**Prefix**: `SUBFLOW:`

```mermaid
Subflow[[SUBFLOW: Email Notification]]
```

## Edge Labels

### Decision Outcomes
Edges from Decision nodes should have labels indicating the outcome:

```mermaid
Decision{DECISION: Age Check}
Decision -->|18 or older| NextStep
Decision -->|Under 18 default| OtherStep
```

**Important**: Use the keyword `default` in the edge label to mark the default outcome.

## Metadata Extraction

### API Names
By default, API names are generated from node labels. You can specify custom API names in the node label:

```mermaid
Assign[ASSIGNMENT: Set Flag
api: Custom_API_Name]
```

### Assignment Values
Specify assignments inline in the label:

```mermaid
Assign[ASSIGNMENT: Initialize
set: v_Counter = 0
set: v_Name = John]
```

### Decision Conditions
Specify conditions in the label:

```mermaid
Decision{DECISION: Check Age
condition: v_Age >= 18}
```

### Screen Components
Define screen components in the label:

```mermaid
Screen[SCREEN: User Input
field: Name (String)
field: Age (Number)
display: Enter your information]
```

### RecordCreate Fields
Specify object and field values:

```mermaid
Create[CREATE: New Account
object: Account
field: Name = ACME Corp
field: Industry = Technology]
```

### RecordUpdate Fields and Filters
Specify object, filters, and field updates:

```mermaid
Update[UPDATE: Account Status
object: Account
filter: Id = {!recordId}
field: Status__c = Active]
```

### Subflow Parameters
Specify input and output assignments:

```mermaid
Subflow[[SUBFLOW: Send Email
flow: Email_Notification_Flow
input: recipientEmail = {!v_Email}
output: v_Success = emailSent]]
```

## Complete Example

```mermaid
flowchart TD
    Start([START: Customer Onboarding])
    Screen1[SCREEN: Collect Info
            field: CustomerName (String)
            field: CustomerEmail (String)]

    Assign[ASSIGNMENT: Initialize
           set: v_Status = New
           set: v_Priority = High]

    Decision{DECISION: Account Exists?
             condition: v_AccountId != null}

    CreateAcc[CREATE: New Account
              object: Account
              field: Name = {!v_CustomerName}
              field: Email__c = {!v_CustomerEmail}]

    UpdateAcc[UPDATE: Existing Account
              object: Account
              filter: Id = {!v_AccountId}
              field: Status__c = {!v_Status}]

    Notify[[SUBFLOW: Send Welcome Email
            flow: Welcome_Email_Flow
            input: email = {!v_CustomerEmail}]]

    Final[SCREEN: Confirmation
          display: Account has been processed!]

    End([END: Complete])

    Start --> Screen1
    Screen1 --> Assign
    Assign --> Decision
    Decision -->|No Account| CreateAcc
    Decision -->|Has Account default| UpdateAcc
    CreateAcc --> Notify
    UpdateAcc --> Notify
    Notify --> Final
    Final --> End
```

## Best Practices

### 1. Use Descriptive Labels
```mermaid
✅ Good: Check{DECISION: Account Type}
❌ Bad:  Check{DECISION: x}
```

### 2. Always Mark Default Outcome
Every Decision must have exactly one default outcome:
```mermaid
✅ Good: Decision -->|Fallback default| End
❌ Bad:  Decision -->|Fallback| End
```

### 3. One Start, At Least One End
- Flows must have exactly one START element
- Flows must have at least one END element

### 4. All Nodes Must Be Reachable
Every element should be reachable from the START node. Unreachable nodes will generate warnings.

### 5. No Cycles Without Exit Condition
Avoid infinite loops:
```mermaid
❌ Bad:
Step1 --> Step2
Step2 --> Step1  # Infinite loop!
```

### 6. Variable References
Use Salesforce Flow variable syntax in expressions:
- `{!variableName}` for merge fields
- `$Record.FieldName` for record fields

### 7. API Name Constraints
- Must start with a letter
- Can only contain letters, numbers, and underscores
- Auto-generated from labels if not specified

## Validation

Use the `lint` command to validate your Mermaid files:

```bash
# Lint a single file
mermaid-flow-compile lint --input my-flow.mmd

# Lint all files in a directory
mermaid-flow-compile lint --input flows/

# Strict mode (treat warnings as errors)
mermaid-flow-compile lint --input my-flow.mmd --strict
```

## Compilation

Compile Mermaid to Salesforce Flow XML:

```bash
mermaid-flow-compile compile \
  --input my-flow.mmd \
  --out-flow flows/ \
  --out-json dsl/ \
  --out-docs docs/
```

This generates:
- `flows/my-flow.flow-meta.xml` - Salesforce Flow XML
- `dsl/my-flow.flow.json` - Intermediate DSL representation
- `docs/my-flow.md` - Markdown documentation
- `docs/my-flow.mmd` - Normalized Mermaid diagram

## Troubleshooting

### "Unknown element type"
Ensure your node label starts with a recognized prefix:
- START:, END:, ASSIGNMENT:, DECISION:, SCREEN:, CREATE:, UPDATE:, SUBFLOW:

### "Edge references unknown node"
Make sure all edge targets refer to existing node IDs.

### "Decision must have exactly one default outcome"
Add the `default` keyword to one outcome label:
```mermaid
Decision -->|Other default| End
```

### "Element not reachable from Start"
Ensure all nodes are connected to the main flow starting from START.

## Additional Resources

- See `examples/v1/` for complete working examples
- Check `docs/ARCHITECTURE.md` for technical details
- Review generated `.md` files in `docs/` for flow documentation
