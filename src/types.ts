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

/**
 * Certificate creation configuration
 */
export interface CertificateCreationConfig {
  name: string;
  subject: string;
  issuer?: string; // For intermediate and end-entity certificates
  keySize?: number;
  validityDays?: number;
  keyUsage?: string[];
  extendedKeyUsage?: string[];
  san?: string[]; // Subject Alternative Names
  isCA?: boolean;
  pathLength?: number; // For CA certificates
}

/**
 * Root CA creation configuration
 */
export interface RootCAConfig extends CertificateCreationConfig {
  name: string;
  subject: string;
  keySize?: number;
  validityDays?: number;
}

/**
 * Intermediate CA creation configuration
 */
export interface IntermediateCAConfig extends CertificateCreationConfig {
  name: string;
  subject: string;
  issuerCA: string; // Name of the root CA in Key Vault
  keySize?: number;
  validityDays?: number;
}

/**
 * End-entity certificate creation configuration
 */
export interface EndEntityCertConfig extends CertificateCreationConfig {
  name: string;
  subject: string;
  issuerCA: string; // Name of the intermediate CA in Key Vault
  keySize?: number;
  validityDays?: number;
  san?: string[];
}

/**
 * Certificate creation result
 */
export interface CertificateCreationResult extends OperationResult {
  certificateName: string;
  certificateData?: CertificateData;
  thumbprint?: string;
}
