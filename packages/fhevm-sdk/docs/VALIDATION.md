# Input Validation Guide

Best practices for validating user inputs in FHEVM SDK applications.

## Overview

Validation is critical for:

- **Security**: Prevent invalid inputs from reaching contracts
- **User Experience**: Clear feedback on errors
- **Reliability**: Catch errors early before expensive operations

```typescript
import {
  assertValidAddress,
  assertValidFhevmType,
  assertValidEncryptionValue,
} from "@fhevm-sdk";

function encryptValue(address, value, type) {
  // Validate inputs early
  assertValidAddress(address, "contractAddress");
  assertValidFhevmType(type);
  assertValidEncryptionValue(value, type);

  // Now proceed with confidence
  return instance.encrypt(value, type);
}
```

## Validation Strategies

### Strategy 1: Fail Fast

Validate at function entry:

```typescript
async function encryptAndStore(address, value, type, storage) {
  // Validate ALL inputs immediately
  assertValidAddress(address);
  assertValidFhevmType(type);
  assertValidEncryptionValue(value, type);
  assertDefined(storage, "storage");

  // Safe to proceed
  const encrypted = await instance.encrypt(value, type);
  await storage.set(encodeKey(address, type), encrypted);
  return encrypted;
}
```

### Strategy 2: Progressive Validation

Validate as user types:

```typescript
function EncryptForm() {
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState({});

  const handleAddressChange = (e) => {
    const newAddress = e.target.value;
    setAddress(newAddress);

    // Validate as user types
    if (newAddress && !isValidAddress(newAddress)) {
      setErrors({ ...errors, address: "Invalid Ethereum address" });
    } else {
      const { address, ...rest } = errors;
      setErrors(rest);
    }
  };

  return (
    <form>
      <input value={address} onChange={handleAddressChange} />
      {errors.address && <span className="error">{errors.address}</span>}
    </form>
  );
}
```

## Address Validation

### Basic Validation

```typescript
import { isValidAddress, assertValidAddress } from "@fhevm-sdk";

// Check if valid
if (isValidAddress(userInput)) {
  console.log("Valid address");
}

// Throw on invalid
assertValidAddress(userInput, "contractAddress");
```

### Batch Validation

```typescript
import { validateAddresses } from "@fhevm-sdk";

const addresses = ["0x1234...", "0x5678...", "invalid"];

try {
  validateAddresses(addresses, true); // Throws on first invalid
  console.log("All valid");
} catch (error) {
  console.error("Invalid address found");
}
```

## FHEVM Type Validation

### Basic Type Validation

```typescript
import { isValidFhevmType, assertValidFhevmType, getValidFhevmTypes } from "@fhevm-sdk";

// Check type
if (isValidFhevmType("euint32")) {
  console.log("Valid type");
}

// Assert
assertValidFhevmType(userType);

// Get valid types
const types = getValidFhevmTypes();
// ["ebool", "euint8", "euint16", "euint32", "euint64", "euint128", "euint256", "eaddress"]
```

### Type Selection Helper

```typescript
function selectAppropriateType(value) {
  if (value <= 1) return "ebool";
  if (value <= 255) return "euint8";
  if (value <= 65535) return "euint16";
  if (value <= 4294967295) return "euint32";
  if (value <= Number.MAX_SAFE_INTEGER) return "euint64";
  return "euint128";
}
```

## Value Validation

### Basic Value Validation

```typescript
import { validateEncryptionValue, assertValidEncryptionValue } from "@fhevm-sdk";

// Check if valid
if (validateEncryptionValue(42, "euint32")) {
  console.log("Value valid");
}

// Assert with error
assertValidEncryptionValue(999, "euint8"); // Throws: Max is 255
```

### Value Ranges

| Type | Min | Max |
|------|-----|-----|
| `ebool` | 0 | 1 |
| `euint8` | 0 | 255 |
| `euint16` | 0 | 65,535 |
| `euint32` | 0 | 4,294,967,295 |
| `euint64` | 0 | 18,446,744,073,709,551,615 |

### Custom Value Validation

```typescript
function validateValueWithSuggestions(value, type) {
  if (!validateEncryptionValue(value, type)) {
    const ranges = {
      ebool: { min: 0, max: 1 },
      euint8: { min: 0, max: 255 },
      euint16: { min: 0, max: 65535 },
      euint32: { min: 0, max: 4294967295 },
    };

    const range = ranges[type];
    throw new Error(
      `Value ${value} out of range for ${type}. ` +
      `Valid range: ${range.min} to ${range.max}`
    );
  }
}
```

## Parameter Validation

### Required Parameters

```typescript
import { assertDefined, assertRequiredParams, assertNotEmpty } from "@fhevm-sdk";

// Single parameter
assertDefined(value, "value");

// Multiple parameters
assertRequiredParams(params, ["address", "value", "type"]);

// Non-empty string
assertNotEmpty(message, "message");
```

### Optional Parameters with Defaults

```typescript
function operateWithDefaults(options = {}) {
  const maxRetries = options?.maxRetries ?? 3;
  const timeout = options?.timeout ?? 5000;

  return runOperation(maxRetries, timeout);
}
```

## Batch Validation

### Array Validation

```typescript
import { assertNotEmptyArray } from "@fhevm-sdk";

function processValues(values) {
  assertNotEmptyArray(values, "values");

  // Validate all items
  values.forEach((value, i) => {
    if (!validateValue(value)) {
      throw new Error(`Invalid value at index ${i}`);
    }
  });
}
```

### Batch Processing with Validation

```typescript
async function encryptBatch(items) {
  const results = [];

  for (let i = 0; i < items.length; i++) {
    try {
      assertValidAddress(items[i].address);
      validateEncryptionValue(items[i].value, "euint32");

      const encrypted = await instance.encrypt(items[i].value, "euint32");
      results.push({ success: true, encrypted });
    } catch (error) {
      results.push({ success: false, error: `Item ${i}: ${error.message}` });
    }
  }

  return results;
}
```

## Custom Validators

### Reusable Validators

```typescript
const validators = {
  address: (value) => {
    assertValidAddress(value);
    return value;
  },

  fhevmType: (value) => {
    assertValidFhevmType(value);
    return value;
  },

  positiveInteger: (value) => {
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) {
      throw new Error("Value must be positive integer");
    }
    return num;
  },
};

// Usage
const address = validators.address(userInput);
const type = validators.fhevmType(userType);
```

### Composable Validators

```typescript
function validateEncryption(data) {
  assertRequiredParams(data, ["address", "value", "type"]);

  return {
    address: validators.address(data.address),
    type: validators.fhevmType(data.type),
    value: validators.encryptionValue(data.value, data.type),
  };
}
```

### Error Aggregation

```typescript
function validateAll(data) {
  const errors = {};

  try {
    validators.address(data.address);
  } catch (e) {
    errors.address = e.message;
  }

  try {
    validators.fhevmType(data.type);
  } catch (e) {
    errors.type = e.message;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// Usage
const validation = validateAll(formData);
if (!validation.valid) {
  setErrors(validation.errors);
}
```
