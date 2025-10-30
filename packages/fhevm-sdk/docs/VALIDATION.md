# Input Validation Guide

Best practices for validating user inputs in FHEVM SDK applications.

## Table of Contents

1. [Overview](#overview)
2. [Validation Strategies](#validation-strategies)
3. [Address Validation](#address-validation)
4. [FHEVM Type Validation](#fhevm-type-validation)
5. [Value Validation](#value-validation)
6. [Parameter Validation](#parameter-validation)
7. [Batch Validation](#batch-validation)
8. [Custom Validators](#custom-validators)

## Overview

Validation is critical for FHEVM applications:

- **Security**: Prevent invalid inputs from reaching contracts
- **User Experience**: Provide clear feedback on what went wrong
- **Reliability**: Catch errors early before expensive operations
- **Type Safety**: Ensure TypeScript types match runtime values

```typescript
import {
  assertValidAddress,
  assertValidFhevmType,
  assertValidEncryptionValue,
  assertRequiredParams,
  assertDefined,
  assertNotEmpty,
} from "@fhevm-sdk";

// Early validation catches errors fast
function encryptValue(
  address: unknown,
  value: unknown,
  type: unknown
): Promise<string> {
  // Validate inputs early
  assertValidAddress(address, "contractAddress");
  assertValidFhevmType(type);
  assertValidEncryptionValue(value, type as FhevmEncryptedType);

  // Now we can proceed with confidence
  return instance.encrypt(value, type);
}
```

## Validation Strategies

### Strategy 1: Fail Fast

Validate at the entry point of functions:

```typescript
async function encryptAndStore(
  address: string,
  value: number,
  type: string,
  storage: Storage
) {
  // Validate ALL inputs immediately
  try {
    assertValidAddress(address);
    assertValidFhevmType(type);
    assertValidEncryptionValue(value, type as FhevmEncryptedType);
    assertDefined(storage, "storage");
  } catch (error) {
    throw new Error(`Input validation failed: ${error.message}`);
  }

  // Safe to proceed
  const encrypted = await instance.encrypt(value, type);
  await storage.set(encodeKey(address, type), encrypted);

  return encrypted;
}
```

### Strategy 2: Progressive Validation

Validate inputs as they're provided:

```typescript
// React component example
function EncryptForm() {
  const [address, setAddress] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState("euint32");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);

    // Validate as user types
    const newErrors = { ...errors };
    if (newAddress && !isValidAddress(newAddress)) {
      newErrors.address = "Invalid Ethereum address";
    } else {
      delete newErrors.address;
    }
    setErrors(newErrors);
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    setValue(newValue.toString());

    // Validate value for selected type
    const newErrors = { ...errors };
    if (!Number.isNaN(newValue) && !validateEncryptionValue(newValue, type)) {
      newErrors.value = `Value out of range for ${type}`;
    } else {
      delete newErrors.value;
    }
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation before submit
    try {
      assertValidAddress(address);
      assertValidFhevmType(type);
      assertValidEncryptionValue(parseInt(value), type as FhevmEncryptedType);
    } catch (error) {
      setErrors({ submit: error.message });
      return;
    }

    // Proceed with encryption
    await encryptValue(address, parseInt(value), type);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={address}
        onChange={handleAddressChange}
        placeholder="Contract address"
      />
      {errors.address && <span className="error">{errors.address}</span>}

      <input
        type="number"
        value={value}
        onChange={handleValueChange}
        placeholder="Value to encrypt"
      />
      {errors.value && <span className="error">{errors.value}</span>}

      <select value={type} onChange={(e) => setType(e.target.value)}>
        {getValidFhevmTypes().map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {errors.submit && <span className="error">{errors.submit}</span>}
      <button type="submit">Encrypt</button>
    </form>
  );
}
```

### Strategy 3: Validation at Boundaries

Validate when receiving data from external sources:

```typescript
// API endpoint
app.post("/encrypt", async (req, res) => {
  try {
    // Validate all inputs from request
    const { address, value, type } = req.body;

    assertDefined(address, "address");
    assertDefined(value, "value");
    assertDefined(type, "type");

    assertValidAddress(address);
    assertValidFhevmType(type);
    assertValidEncryptionValue(value, type);

    // Process validated inputs
    const result = await encryptValue(
      instance,
      address,
      value,
      type
    );

    res.json({ success: true, encrypted: result });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});
```

## Address Validation

### Basic Validation

```typescript
import {
  isValidAddress,
  assertValidAddress,
} from "@fhevm-sdk";

// Check if address is valid
if (isValidAddress(userInput)) {
  console.log("Address is valid");
} else {
  console.log("Address is invalid");
}

// Throw on invalid
try {
  assertValidAddress(userInput, "contractAddress");
  // Use validated address
} catch (error) {
  console.error(`Invalid address: ${error.message}`);
}
```

### Batch Address Validation

```typescript
import { validateAddresses } from "@fhevm-sdk";

// Validate multiple addresses
const addresses = [
  "0x1234567890123456789012345678901234567890",
  "0x0987654321098765432109876543210987654321",
  "invalid_address",
];

try {
  const results = validateAddresses(addresses, true);
  console.log("All addresses valid");
} catch (error) {
  console.error("Found invalid address:", error.message);
}
```

### Custom Address Validation

```typescript
import { isValidAddress } from "@fhevm-sdk";

// Validate and get suggestions
function validateAddressWithSuggestions(address: unknown) {
  if (!isValidAddress(address)) {
    // Provide helpful suggestions
    if (typeof address === "string") {
      if (address.length !== 42) {
        throw new Error(
          `Address has ${address.length} characters, expected 42 (including 0x)`
        );
      }
      if (!address.startsWith("0x")) {
        throw new Error("Address must start with 0x");
      }
      const hexPart = address.slice(2);
      for (let i = 0; i < hexPart.length; i++) {
        const char = hexPart[i];
        if (!/[0-9a-fA-F]/.test(char)) {
          throw new Error(
            `Invalid character '${char}' at position ${i + 2}. ` +
            `Address must contain only hexadecimal characters (0-9, a-f, A-F)`
          );
        }
      }
    }
    throw new Error(
      "Invalid address format. Expected 42-character hex string starting with 0x"
    );
  }
  return address as `0x${string}`;
}
```

## FHEVM Type Validation

### Basic Type Validation

```typescript
import {
  isValidFhevmType,
  assertValidFhevmType,
  getValidFhevmTypes,
} from "@fhevm-sdk";

// Check if type is valid
if (isValidFhevmType(userType)) {
  console.log("Type is valid");
}

// Assert and throw
try {
  assertValidFhevmType(userType);
} catch {
  console.error("Invalid FHEVM type");
}

// Get list of valid types
const types = getValidFhevmTypes();
console.log("Valid types:", types);
// ["ebool", "euint8", "euint16", "euint32", "euint64", "euint128", "euint256", "eaddress"]
```

### Type Selection

```typescript
import { getValidFhevmTypes } from "@fhevm-sdk";

// Suggest appropriate type based on value size
function selectAppropriateType(value: number): FhevmEncryptedType {
  if (value < 0 || !Number.isInteger(value)) {
    throw new Error("Value must be a non-negative integer");
  }

  if (value <= 1) return "ebool"; // or euint8, depending on context
  if (value <= 255) return "euint8";
  if (value <= 65535) return "euint16";
  if (value <= 4294967295) return "euint32";
  if (value <= Number.MAX_SAFE_INTEGER) return "euint64";
  return "euint128";
}

// Usage
const type = selectAppropriateType(42);
console.log(`Selected type: ${type}`); // "euint8"
```

### Custom Type Validation

```typescript
import { isValidFhevmType, getValidFhevmTypes } from "@fhevm-sdk";

function validateTypeWithSuggestions(type: unknown): FhevmEncryptedType {
  if (!isValidFhevmType(type)) {
    const validTypes = getValidFhevmTypes();

    // Try to find close matches
    const typeStr = String(type).toLowerCase();
    const matches = validTypes.filter(t =>
      t.includes(typeStr) || typeStr.includes(t)
    );

    if (matches.length > 0) {
      throw new Error(
        `Invalid type "${type}". Did you mean: ${matches.join(", ")}?`
      );
    }

    throw new Error(
      `Invalid type "${type}". Valid types: ${validTypes.join(", ")}`
    );
  }

  return type as FhevmEncryptedType;
}
```

## Value Validation

### Basic Value Validation

```typescript
import {
  validateEncryptionValue,
  assertValidEncryptionValue,
} from "@fhevm-sdk";

// Check if value is valid for type
if (validateEncryptionValue(42, "euint32")) {
  console.log("Value is valid");
}

// Assert and throw with details
try {
  assertValidEncryptionValue(999, "euint8"); // Max is 255
} catch (error) {
  console.error(error.message);
  // "Value 999 is out of range for euint8. Valid range: 0 to 255"
}
```

### Value Range Suggestions

```typescript
// Predefined type ranges
const TYPE_RANGES: Record<FhevmEncryptedType, { min: bigint; max: bigint }> = {
  ebool: { min: 0n, max: 1n },
  euint8: { min: 0n, max: 255n },
  euint16: { min: 0n, max: 65535n },
  euint32: { min: 0n, max: 4294967295n },
  euint64: { min: 0n, max: 18446744073709551615n },
  euint128: { min: 0n, max: 340282366920938463463374607431768211455n },
  euint256: { min: 0n, max: 115792089237316195423570985008687907853269984665640564039457584007913129639935n },
  eaddress: { min: 0n, max: 1n }, // Not used
};

function validateValueWithSuggestions(
  value: unknown,
  type: FhevmEncryptedType
): void {
  if (!validateEncryptionValue(value, type)) {
    const range = TYPE_RANGES[type];

    // Provide helpful guidance
    if (type === "ebool") {
      throw new Error(
        `Invalid boolean value "${value}". ` +
        `Use: true, false, 0, or 1`
      );
    }

    if (type === "eaddress") {
      throw new Error(
        `Invalid address value "${value}". ` +
        `Must be a valid Ethereum address (0x...)`
      );
    }

    // For numeric types, suggest how to fix
    try {
      const bigVal = BigInt(value as any);

      if (bigVal < range.min) {
        throw new Error(
          `Value ${value} is too small for ${type}. Minimum: ${range.min}`
        );
      }

      if (bigVal > range.max) {
        throw new Error(
          `Value ${value} is too large for ${type}. Maximum: ${range.max}`
        );
      }
    } catch {
      throw new Error(
        `Value ${value} cannot be converted to a number. ` +
        `Expected numeric value between ${range.min} and ${range.max}`
      );
    }
  }
}
```

### Special Type Validation

```typescript
// Boolean validation
function validateBoolean(value: unknown): boolean {
  return (
    typeof value === "boolean" ||
    value === 0 ||
    value === 1 ||
    value === "true" ||
    value === "false"
  );
}

// Address validation (already covered above)
function validateEAddress(value: unknown): boolean {
  return isValidAddress(value);
}

// Combined validation for ebool
function validateEBoolValue(value: unknown): void {
  if (!validateBoolean(value)) {
    throw new Error(
      `Invalid ebool value "${value}". ` +
      `Must be: true, false, 0, or 1`
    );
  }
}
```

## Parameter Validation

### Required Parameter Validation

```typescript
import {
  assertDefined,
  assertRequiredParams,
  assertNotEmpty,
} from "@fhevm-sdk";

// Validate single parameter
function processValue(value: unknown) {
  assertDefined(value, "value");
  // value is now not undefined/null
  return value;
}

// Validate multiple parameters
function encryptMultiple(params: {
  address?: string;
  value?: number;
  type?: string;
}) {
  assertRequiredParams(params, ["address", "value", "type"]);
  // All params are now defined and non-null
}

// Validate string not empty
function sendMessage(message: unknown) {
  assertNotEmpty(message as string, "message");
  // message is now a non-empty string
}
```

### Optional Parameter Handling

```typescript
// With defaults
function operateWithDefaults(options?: {
  maxRetries?: number;
  timeout?: number;
}) {
  const maxRetries = options?.maxRetries ?? 3;
  const timeout = options?.timeout ?? 5000;

  // Use validated defaults
  return runOperation(maxRetries, timeout);
}

// With validation
interface OperationOptions {
  address: string;
  value: number;
  type: FhevmEncryptedType;
  retries?: number;
  timeout?: number;
}

function validateOptions(options: unknown): OperationOptions {
  assertRequiredParams(options as any, ["address", "value", "type"]);

  const opts = options as any;

  assertValidAddress(opts.address);
  assertValidFhevmType(opts.type);
  assertValidEncryptionValue(opts.value, opts.type);

  // Validate optional parameters
  if (opts.retries !== undefined) {
    if (!Number.isInteger(opts.retries) || opts.retries < 1) {
      throw new Error("retries must be a positive integer");
    }
  }

  if (opts.timeout !== undefined) {
    if (!Number.isInteger(opts.timeout) || opts.timeout < 100) {
      throw new Error("timeout must be >= 100ms");
    }
  }

  return {
    address: opts.address,
    value: opts.value,
    type: opts.type,
    retries: opts.retries ?? 3,
    timeout: opts.timeout ?? 5000,
  };
}
```

## Batch Validation

### Array Validation

```typescript
import {
  assertNotEmptyArray,
  assertAllValid,
} from "@fhevm-sdk";

// Check array is not empty
function processValues(values: unknown[]) {
  assertNotEmptyArray(values, "values");
  // values is now a non-empty array
}

// Validate all items satisfy condition
function encryptBatch(
  addresses: unknown[],
  values: unknown[],
  type: string
) {
  assertNotEmptyArray(addresses, "addresses");
  assertNotEmptyArray(values, "values");

  // All arrays must have same length
  if (addresses.length !== values.length) {
    throw new Error(
      `Length mismatch: ${addresses.length} addresses vs ${values.length} values`
    );
  }

  // Validate all addresses
  assertAllValid(
    addresses,
    (addr) => isValidAddress(addr),
    "All addresses must be valid"
  );

  // Validate all values are in range
  assertAllValid(
    values,
    (val) => validateEncryptionValue(val, type as any),
    `All values must be valid for type ${type}`
  );
}
```

### Processing with Validation

```typescript
// Map with validation
async function encryptBatch(
  items: Array<{ address: string; value: number }>
) {
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    try {
      assertValidAddress(item.address);
      validateEncryptionValue(item.value, "euint32");

      const encrypted = await instance.encrypt(item.value, "euint32");
      results.push({ success: true, encrypted });
    } catch (error) {
      results.push({
        success: false,
        error: `Item ${i}: ${error.message}`,
      });
    }
  }

  return results;
}
```

## Custom Validators

### Creating Reusable Validators

```typescript
// Validator function type
type Validator<T> = (value: unknown) => T;

// Create validators
const validators = {
  address: (value: unknown): `0x${string}` => {
    assertValidAddress(value);
    return value as `0x${string}`;
  },

  fhevmType: (value: unknown): FhevmEncryptedType => {
    assertValidFhevmType(value);
    return value as FhevmEncryptedType;
  },

  encryptionValue: (value: unknown, type: FhevmEncryptedType): any => {
    assertValidEncryptionValue(value, type);
    return value;
  },

  positiveInteger: (value: unknown): number => {
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) {
      throw new Error("Value must be a positive integer");
    }
    return num;
  },
};

// Use validators
const address = validators.address(userInput);
const type = validators.fhevmType(userType);
const value = validators.encryptionValue(userValue, type);
```

### Composable Validators

```typescript
// Compose validators
function validateEncryption(data: unknown) {
  assertRequiredParams(data as any, ["address", "value", "type"]);

  const typed = data as any;
  return {
    address: validators.address(typed.address),
    type: validators.fhevmType(typed.type),
    value: validators.encryptionValue(typed.value, typed.type),
  };
}

// Chain validators
async function processAndEncrypt(data: unknown) {
  const validated = validateEncryption(data);
  const encrypted = await instance.encrypt(validated.value, validated.type);
  return encrypted;
}
```

### Conditional Validation

```typescript
// Validate based on context
function validateForOperation(
  data: unknown,
  operation: "encrypt" | "decrypt"
) {
  if (operation === "encrypt") {
    // Encryption needs address and value
    assertRequiredParams(data as any, ["address", "value", "type"]);
    const typed = data as any;
    return {
      address: validators.address(typed.address),
      value: validators.encryptionValue(typed.value, typed.type),
      type: validators.fhevmType(typed.type),
    };
  } else {
    // Decryption needs handle and signature
    assertRequiredParams(data as any, ["handle", "signature"]);
    const typed = data as any;
    return {
      handle: validators.hexString(typed.handle),
      signature: validators.hexString(typed.signature),
    };
  }
}
```

### Error Aggregation

```typescript
// Collect all validation errors
function validateAll(data: unknown): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Address
  try {
    validators.address((data as any).address);
  } catch (e) {
    errors.address = e.message;
  }

  // Value
  try {
    const type = (data as any).type || "euint32";
    validators.encryptionValue((data as any).value, type);
  } catch (e) {
    errors.value = e.message;
  }

  // Type
  try {
    validators.fhevmType((data as any).type);
  } catch (e) {
    errors.type = e.message;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// Usage in form
const validation = validateAll(formData);
if (!validation.valid) {
  setErrors(validation.errors);
  return;
}
```
