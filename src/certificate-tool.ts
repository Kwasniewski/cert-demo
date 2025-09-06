import { KeyVaultClient } from './keyvault-client';
import { CertificateChainBuilder } from './certificate-chain';
import { 
  KeyVaultConfig, 
  ChainConfig, 
  OperationResult, 
  CertificateData, 
  CertificateInfo,
  AuthOptions 
} from './types';

/**
 * Main certificate tool that orchestrates the certificate chaining process
 */
export class CertificateTool {
  private keyVaultClient: KeyVaultClient;
  private chainBuilder: CertificateChainBuilder;
  private config: KeyVaultConfig;

  constructor(config: KeyVaultConfig, authOptions?: AuthOptions) {
    this.config = config;
    this.keyVaultClient = new KeyVaultClient(config, authOptions);
    this.chainBuilder = new CertificateChainBuilder();
  }

  /**
   * Main method to download, chain, and upload a certificate
   */
  async processCertificateChain(chainConfig: ChainConfig): Promise<OperationResult> {
    try {
      console.log(`Starting certificate chain process for: ${chainConfig.sourceCertificateName}`);
      
      // Step 1: Download the source certificate
      console.log('Step 1: Downloading source certificate...');
      const sourceCertificate = await this.downloadSourceCertificate(chainConfig.sourceCertificateName);
      console.log('✓ Source certificate downloaded successfully');

      // Step 2: Get certificate information
      console.log('Step 2: Getting certificate information...');
      const certInfo = await this.getCertificateInfo(chainConfig.sourceCertificateName);
      console.log(`✓ Certificate info retrieved: ${certInfo.subject}`);

      // Step 3: Create certificate chain
      console.log('Step 3: Creating certificate chain...');
      const chainedCertificate = await this.createCertificateChain(sourceCertificate, chainConfig);
      console.log('✓ Certificate chain created successfully');

      // Step 4: Validate the chain
      console.log('Step 4: Validating certificate chain...');
      const isValid = await this.validateCertificateChain(chainedCertificate);
      if (!isValid) {
        throw new Error('Certificate chain validation failed');
      }
      console.log('✓ Certificate chain validation passed');

      // Step 5: Upload the chained certificate
      console.log('Step 5: Uploading chained certificate...');
      const uploadResult = await this.uploadChainedCertificate(chainConfig.targetCertificateName, chainedCertificate);
      if (!uploadResult.success) {
        throw new Error(uploadResult.message);
      }
      console.log('✓ Chained certificate uploaded successfully');

      return {
        success: true,
        message: `Certificate chain process completed successfully. New certificate: ${chainConfig.targetCertificateName}`,
        certificateName: chainConfig.targetCertificateName
      };

    } catch (error) {
      const errorMessage = `Certificate chain process failed: ${error}`;
      console.error('❌', errorMessage);
      return {
        success: false,
        message: errorMessage,
        error: error as Error
      };
    }
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
   * Create the certificate chain
   */
  private async createCertificateChain(
    sourceCertificate: CertificateData, 
    chainConfig: ChainConfig
  ): Promise<CertificateData> {
    try {
      return await this.chainBuilder.createCertificateChain(sourceCertificate, chainConfig);
    } catch (error) {
      throw new Error(`Failed to create certificate chain: ${error}`);
    }
  }

  /**
   * Validate the certificate chain
   */
  private async validateCertificateChain(certificateData: CertificateData): Promise<boolean> {
    try {
      if (!certificateData.chain || certificateData.chain.length === 0) {
        console.warn('No certificate chain to validate');
        return true; // Single certificate is valid
      }

      // Parse certificates for validation
      const certificates = certificateData.chain.map(pem => 
        this.chainBuilder['parsePemCertificate'](pem)
      );

      return await this.chainBuilder.validateCertificateChain(certificates);
    } catch (error) {
      console.error(`Certificate chain validation error: ${error}`);
      return false;
    }
  }

  /**
   * Upload the chained certificate to Key Vault
   */
  private async uploadChainedCertificate(
    certificateName: string, 
    certificateData: CertificateData
  ): Promise<OperationResult> {
    try {
      return await this.keyVaultClient.uploadCertificate(certificateName, certificateData);
    } catch (error) {
      throw new Error(`Failed to upload chained certificate ${certificateName}: ${error}`);
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
}
