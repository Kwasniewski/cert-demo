# Azure Certificate Demo

This is a demo project to demonstrate how to use Azure Key Vault to store and manage certificates.

## Installation

1. Clone or download this project
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Configuration

### Environment Variables

Set the following environment variables for authentication:

```bash
export AZURE_KEY_VAULT_URL="https://your-keyvault.vault.azure.net/"
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"  # Optional if using managed identity
export AZURE_USE_MANAGED_IDENTITY="true"  # Set to true for managed identity
```

### Azure Permissions

Your Azure service principal or managed identity needs the following permissions on the Key Vault:

- `Certificate: Get` - to download certificates
- `Certificate: Import` - to upload certificates
- `Certificate: List` - to list certificates
- `Certificate: Delete` - to delete certificates (optional)

## Usage

### Command Line Interface

#### Test Connection

```bash
npm run dev -- test
```

#### List Certificates

```bash
npm run dev -- list
```

#### Get Certificate Information

```bash
npm run dev -- info --name my-certificate
```

#### Delete Certificate

```bash
npm run dev -- delete --name my-certificate --confirm
```

### Command Line Options

#### Global Options

- `-v, --vault-url <url>` - Azure Key Vault URL
- `-t, --tenant-id <id>` - Azure Tenant ID
- `-c, --client-id <id>` - Azure Client ID
- `-s, --client-secret <secret>` - Azure Client Secret
- `--use-managed-identity` - Use managed identity for authentication
- `--use-client-secret` - Use client secret for authentication
- `--verbose` - Enable verbose logging

## Authentication Methods

### 1. Managed Identity (Recommended for Azure VMs/App Services)

```bash
export AZURE_USE_MANAGED_IDENTITY="true"
npm run dev -- test
```

### 2. Client Secret

```bash
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"
export AZURE_TENANT_ID="your-tenant-id"
export AZURE_USE_CLIENT_SECRET="true"
npm run dev -- test
```

### 3. Command Line Arguments

```bash
npm run dev -- test \
  --vault-url "https://your-keyvault.vault.azure.net/" \
  --tenant-id "your-tenant-id" \
  --client-id "your-client-id" \
  --client-secret "your-client-secret"
```
