# Azure Certificate Chain Tool

A TypeScript tool for downloading certificates from Azure Key Vault, creating chained certificates with intermediate and root certificates, and uploading them back to Azure Key Vault.

## Features

- 🔐 Download certificates from Azure Key Vault
- 🔗 Create certificate chains with intermediate and root certificates
- 📤 Upload chained certificates back to Azure Key Vault
- 🔍 List and inspect certificates
- ✅ Validate certificate chains
- 🛡️ Support for multiple authentication methods (Managed Identity, Client Secret)
- 📋 Comprehensive CLI interface

## Prerequisites

- Node.js 16+ 
- TypeScript 5.0+
- Azure Key Vault with appropriate permissions
- Azure authentication configured

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

#### Create Certificate Chain

```bash
npm run dev -- chain \
  --source my-source-cert \
  --target my-chained-cert \
  --validity-days 365
```

#### Create Certificate Chain with Intermediate Certificates

```bash
npm run dev -- chain \
  --source my-source-cert \
  --target my-chained-cert \
  --intermediate intermediate1.pem intermediate2.pem \
  --root root-cert.pem \
  --validity-days 365
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

#### Chain Command Options

- `-s, --source <name>` - Source certificate name (required)
- `-t, --target <name>` - Target certificate name (required)
- `-i, --intermediate <certs...>` - Intermediate certificates (PEM format)
- `-r, --root <certs...>` - Root certificates (PEM format)
- `--validity-days <days>` - Certificate validity period in days (default: 365)

### Programmatic Usage

```typescript
import { CertificateTool } from './src/certificate-tool';
import { KeyVaultConfig, ChainConfig } from './src/types';

// Configure Key Vault connection
const config: KeyVaultConfig = {
  vaultUrl: 'https://your-keyvault.vault.azure.net/',
  tenantId: 'your-tenant-id',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret' // Optional
};

// Create tool instance
const tool = new CertificateTool(config);

// Configure certificate chain
const chainConfig: ChainConfig = {
  sourceCertificateName: 'my-source-cert',
  targetCertificateName: 'my-chained-cert',
  intermediateCertificates: ['intermediate1.pem', 'intermediate2.pem'],
  rootCertificates: ['root-cert.pem'],
  validityPeriodDays: 365
};

// Process certificate chain
try {
  const result = await tool.processCertificateChain(chainConfig);
  if (result.success) {
    console.log('Certificate chain created successfully:', result.certificateName);
  } else {
    console.error('Failed:', result.message);
  }
} catch (error) {
  console.error('Error:', error);
}
```

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

## Certificate Chain Process

The tool performs the following steps when creating a certificate chain:

1. **Download Source Certificate** - Retrieves the source certificate from Azure Key Vault
2. **Extract Certificate Information** - Parses certificate details (subject, issuer, validity, etc.)
3. **Create New Certificate** - Generates a new certificate based on the source certificate
4. **Build Certificate Chain** - Combines the new certificate with intermediate and root certificates
5. **Validate Chain** - Verifies the certificate chain integrity and validity
6. **Upload to Key Vault** - Stores the chained certificate in Azure Key Vault

## File Structure

```
src/
├── types.ts                 # TypeScript interfaces and types
├── keyvault-client.ts       # Azure Key Vault client implementation
├── certificate-chain.ts     # Certificate chaining logic
├── certificate-tool.ts      # Main tool orchestrator
├── cli.ts                   # Command line interface
└── index.ts                 # Main entry point
```

## Error Handling

The tool includes comprehensive error handling:

- Connection validation
- Certificate parsing errors
- Chain validation failures
- Upload/download errors
- Authentication failures

All errors are logged with descriptive messages and appropriate exit codes.

## Security Considerations

- Store sensitive credentials in environment variables or Azure Key Vault
- Use managed identity when possible
- Limit Key Vault permissions to minimum required
- Validate certificate chains before deployment
- Regularly rotate certificates and secrets

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify Azure credentials and permissions
   - Check Key Vault access policies
   - Ensure correct tenant ID and client ID

2. **Certificate Not Found**
   - Verify certificate name and version
   - Check Key Vault permissions
   - Ensure certificate exists in the vault

3. **Chain Validation Failed**
   - Verify intermediate and root certificates
   - Check certificate validity periods
   - Ensure proper certificate ordering

### Debug Mode

Enable verbose logging for detailed information:

```bash
npm run dev -- --verbose test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Azure Key Vault documentation
3. Create an issue in the repository
