/**
 * Configuration for Azure Key Vault operations
 */
export interface KeyVaultConfig {
  vaultUrl: string;
  // Optional: Only needed for specific authentication scenarios
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  certificatePath?: string;
}

/**
 * Certificate information
 */
export interface CertificateInfo {
  name: string;
  version: string;
  thumbprint: string;
  notBefore: Date;
  notAfter: Date;
  subject: string;
  issuer: string;
  keyUsage: string[];
  extendedKeyUsage: string[];
}

/**
 * Certificate chain configuration
 */
export interface ChainConfig {
  sourceCertificateName: string;
  targetCertificateName: string;
  intermediateCertificates?: string[];
  rootCertificates?: string[];
  validityPeriodDays?: number;
}

/**
 * Operation result
 */
export interface OperationResult {
  success: boolean;
  message: string;
  certificateName?: string;
  error?: Error;
}

/**
 * Certificate data with PEM format
 */
export interface CertificateData {
  certificate: string;
  privateKey?: string;
  chain?: string[];
}

/**
 * Azure authentication options - simplified to use Azure Identity
 */
export interface AuthOptions {
  // Use DefaultAzureCredential (recommended)
  useDefaultCredential?: boolean;
  // Specific credential options (optional)
  useManagedIdentity?: boolean;
  useClientSecret?: boolean;
  useCertificate?: boolean;
  useEnvironmentCredential?: boolean;
  useAzurePowerShellCredential?: boolean;
  useVisualStudioCodeCredential?: boolean;
  useAzureCliCredential?: boolean;
  // Certificate-based auth
  certificateThumbprint?: string;
  certificatePath?: string;
}
