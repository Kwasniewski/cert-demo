import { KeyVaultClient } from './keyvault-client';
import { 
  KeyVaultConfig, 
  ChainConfig, 
  OperationResult, 
  CertificateData, 
  CertificateInfo,
  AuthOptions,
  RootCAConfig,
  IntermediateCAConfig,
  EndEntityCertConfig,
  CertificateCreationResult
} from './types';

/**
 * Main certificate tool that orchestrates the certificate chaining process
 */
export class CertificateTool {
  private keyVaultClient: KeyVaultClient;
  private config: KeyVaultConfig;

  constructor(config: KeyVaultConfig, authOptions?: AuthOptions) {
    this.config = config;
    this.keyVaultClient = new KeyVaultClient(config, authOptions);
  }

  /**
   * Download the source certificate from Key Vault
   */
  private async downloadSourceCertificate(certificateName: string): Promise<CertificateData> {
    try {
      return await this.keyVaultClient.downloadCertificate(certificateName);
    } catch (error) {
      throw new Error(`Failed to download source certificate ${certificateName}: ${error}`);
    }
  }

  /**
   * Get certificate information
   */
  private async getCertificateInfo(certificateName: string): Promise<CertificateInfo> {
    try {
      return await this.keyVaultClient.getCertificateInfo(certificateName);
    } catch (error) {
      throw new Error(`Failed to get certificate info for ${certificateName}: ${error}`);
    }
  }

  /**
   * List all certificates in the Key Vault
   */
  async listCertificates(): Promise<string[]> {
    try {
      return await this.keyVaultClient.listCertificates();
    } catch (error) {
      throw new Error(`Failed to list certificates: ${error}`);
    }
  }

  /**
   * Get detailed information about a certificate
   */
  async getCertificateDetails(certificateName: string, version?: string): Promise<CertificateInfo> {
    try {
      return await this.keyVaultClient.getCertificateInfo(certificateName, version);
    } catch (error) {
      throw new Error(`Failed to get certificate details for ${certificateName}: ${error}`);
    }
  }

  /**
   * Delete a certificate from Key Vault
   */
  async deleteCertificate(certificateName: string): Promise<OperationResult> {
    try {
      return await this.keyVaultClient.deleteCertificate(certificateName);
    } catch (error) {
      throw new Error(`Failed to delete certificate ${certificateName}: ${error}`);
    }
  }

  /**
   * Test Key Vault connection
   */
  async testConnection(): Promise<OperationResult> {
    try {
      console.log('Testing Key Vault connection...');
      const certificates = await this.keyVaultClient.listCertificates();
      console.log(`✓ Connection successful. Found ${certificates.length} certificates.`);
      
      return {
        success: true,
        message: `Key Vault connection successful. Found ${certificates.length} certificates.`
      };
    } catch (error) {
      const errorMessage = `Key Vault connection failed: ${error}`;
      console.error('❌', errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: error as Error
      };
    }
  }

  /**
   * Get Key Vault configuration
   */
  getConfig(): KeyVaultConfig {
    return { ...this.config };
  }

  /**
   * Update Key Vault configuration
   */
  updateConfig(newConfig: Partial<KeyVaultConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.keyVaultClient = new KeyVaultClient(this.config);
  }

  /**
   * Create a new root CA certificate
   */
  async createRootCA(config: RootCAConfig): Promise<CertificateCreationResult> {
    try {
      return await this.keyVaultClient.createRootCA(config);
    } catch (error) {
      throw new Error(`Failed to create root CA ${config.name}: ${error}`);
    }
  }

  /**
   * Create a new intermediate CA certificate
   */
  async createIntermediateCA(config: IntermediateCAConfig): Promise<CertificateCreationResult> {
    try {
      return await this.keyVaultClient.createIntermediateCA(config);
    } catch (error) {
      throw new Error(`Failed to create intermediate CA ${config.name}: ${error}`);
    }
  }

  /**
   * Create a new end-entity certificate
   */
  async createEndEntityCertificate(config: EndEntityCertConfig): Promise<CertificateCreationResult> {
    try {
      return await this.keyVaultClient.createEndEntityCertificate(config);
    } catch (error) {
      throw new Error(`Failed to create end-entity certificate ${config.name}: ${error}`);
    }
  }
}
