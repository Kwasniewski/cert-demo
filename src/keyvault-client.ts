import { CertificateClient } from '@azure/keyvault-certificates';
import { SecretClient } from '@azure/keyvault-secrets';
import { CertificatePolicy } from '@azure/keyvault-certificates';
import { 
  DefaultAzureCredential, 
  ClientSecretCredential,
  ManagedIdentityCredential,
  EnvironmentCredential,
  AzureCliCredential,
  AzurePowerShellCredential,
  VisualStudioCodeCredential,
  ClientCertificateCredential
} from '@azure/identity';
import { KeyVaultConfig, CertificateInfo, CertificateData, OperationResult, AuthOptions } from './types';
import * as forge from 'node-forge';


/**
 * Azure Key Vault client for certificate operations using Azure Identity
 */
export class KeyVaultClient {
  private certificateClient: CertificateClient;
  private secretClient: SecretClient;
  private config: KeyVaultConfig;

  constructor(config: KeyVaultConfig, authOptions?: AuthOptions) {
    this.config = config;
    const credential = this.createCredential(authOptions);
    this.certificateClient = new CertificateClient(this.config.vaultUrl, credential);
    this.secretClient = new SecretClient(this.config.vaultUrl, credential);
  }

  private createCredential(authOptions?: AuthOptions) {
    // Default to DefaultAzureCredential which tries multiple authentication methods
    if (!authOptions || authOptions.useDefaultCredential !== false) {
      return new DefaultAzureCredential();
    }

    // Specific credential types
    if (authOptions.useManagedIdentity) {
      return new ManagedIdentityCredential();
    }

    if (authOptions.useClientSecret && this.config.clientSecret && this.config.tenantId && this.config.clientId) {
      return new ClientSecretCredential(
        this.config.tenantId,
        this.config.clientId,
        this.config.clientSecret
      );
    }

    if (authOptions.useEnvironmentCredential) {
      return new EnvironmentCredential();
    }

    if (authOptions.useAzureCliCredential) {
      return new AzureCliCredential();
    }

    if (authOptions.useAzurePowerShellCredential) {
      return new AzurePowerShellCredential();
    }

    if (authOptions.useVisualStudioCodeCredential) {
      return new VisualStudioCodeCredential();
    }

    if (authOptions.useCertificate && this.config.certificatePath && this.config.tenantId && this.config.clientId) {
      return new ClientCertificateCredential(
        this.config.tenantId,
        this.config.clientId,
        this.config.certificatePath
      );
    }

    // Fallback to DefaultAzureCredential
    return new DefaultAzureCredential();
  }

  /**
   * Download a certificate with its private key using Azure Identity
   */
  async downloadCertificateWithPrivateKey(certificateName: string, version?: string): Promise<CertificateData> {
    try {
      // Get the certificate
      const certificate = version 
        ? await this.certificateClient.getCertificateVersion(certificateName, version)
        : await this.certificateClient.getCertificate(certificateName);

      if (!certificate.cer) {
        throw new Error(`Certificate ${certificateName} has no certificate data`);
      }

      // Convert certificate to PEM format
      const pemCertificate = this.convertToPem(certificate.cer, 'CERTIFICATE');
      
      const result: CertificateData = {
        certificate: pemCertificate
      };

      // Get the private key from the secret store
      try {
        const privateKey = await this.getPrivateKeyFromSecret(certificateName, version);
        if (privateKey) {
          console.log('Private key:', privateKey);
          result.privateKey = privateKey;
        }
      } catch (error) {
        console.warn('Could not retrieve private key:', error);
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to download certificate with private key ${certificateName}: ${error}`);
    }
  }

  /**
   * Get private key from Key Vault secrets (where certificate private keys are stored)
   */
  private async getPrivateKeyFromSecret(certificateName: string, version?: string): Promise<string | null> {
    try {
      // The private key is stored as a secret with the same name as the certificate
      const secret = version 
        ? await this.secretClient.getSecret(certificateName, { version })
        : await this.secretClient.getSecret(certificateName);

      if (secret.value) {
        // The secret value contains the full certificate bundle including private key
        // We need to extract just the private key part
        return this.extractPrivateKeyFromBundle(secret.value);
      }

      return null;
    } catch (error) {
      console.error('Error getting private key from secret:', error);
      return null;
    }
  }

  /**
   * Extract private key from certificate bundle
   */
  private async extractPrivateKeyFromBundle(bundle: string): Promise<string | null> {
    try {
      const buffer = forge.util.decode64(bundle);
      const pfx = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(buffer), false);
      
      // Try to get private key from different bag types
      let privateKey = null;
      
      // First, try to get encrypted private key
      const encryptedBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const encryptedBagArray = encryptedBags?.[forge.pki.oids.pkcs8ShroudedKeyBag];
      if (Array.isArray(encryptedBagArray) && encryptedBagArray.length > 0) {
        const encryptedKey = encryptedBagArray[0];
        if (encryptedKey?.key) {
          privateKey = encryptedKey.key;
        }
      }
      
      // If no encrypted key found, try unencrypted key
      if (!privateKey) {
        const keyBags = pfx.getBags({ bagType: forge.pki.oids.keyBag });
        const keyBagArray = keyBags?.[forge.pki.oids.keyBag];
        if (Array.isArray(keyBagArray) && keyBagArray.length > 0) {
          const unencryptedKey = keyBagArray[0];
          if (unencryptedKey && unencryptedKey.key) {
            privateKey = unencryptedKey.key;
          }
        }
      }
      
      // If we found a private key, convert it to PEM format
      if (privateKey) {
        const privateKeyPem = forge.pki.privateKeyToPem(privateKey);
        console.log('Successfully extracted private key in PEM format');
        return privateKeyPem;
      }
      
      console.warn('No private key found in the certificate bundle');
      return null;
      
    } catch (error) {
      console.error('Error extracting private key from bundle:', error);
      return null;
    }
  }

  /**
   * Download a certificate from Key Vault
   */
  async downloadCertificate(certificateName: string, version?: string): Promise<CertificateData> {
    try {
      const certificate = version 
        ? await this.certificateClient.getCertificateVersion(certificateName, version)
        : await this.certificateClient.getCertificate(certificateName);

      if (!certificate.cer) {
        throw new Error(`Certificate ${certificateName} has no certificate data`);
      }

      // Convert certificate to PEM format
      const pemCertificate = this.convertToPem(certificate.cer, 'CERTIFICATE');
      
      return {
        certificate: pemCertificate
      };
    } catch (error) {
      throw new Error(`Failed to download certificate ${certificateName}: ${error}`);
    }
  }

  /**
   * Upload a certificate to Key Vault
   */
  async uploadCertificate(
    certificateName: string, 
    certificateData: CertificateData,
    policy?: CertificatePolicy
  ): Promise<OperationResult> {
    try {
      // Convert PEM to DER format
      const derCertificate = this.convertPemToDer(certificateData.certificate);
      
      // Create certificate policy if not provided
      const certPolicy = policy || {
        issuerName: 'Self',
        subject: 'CN=Chained Certificate',
        keyType: 'RSA',
        keySize: 2048,
        exportable: true,
        keyUsage: ['digitalSignature', 'keyEncipherment'],
        validityInMonths: 12
      };

      // Import the certificate
      const result = await this.certificateClient.importCertificate(certificateName, derCertificate, certPolicy);
      
      return {
        success: true,
        message: `Certificate ${certificateName} uploaded successfully`,
        certificateName: result.name
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to upload certificate ${certificateName}: ${error}`,
        error: error as Error
      };
    }
  }

  /**
   * Get certificate information
   */
  async getCertificateInfo(certificateName: string, version?: string): Promise<CertificateInfo> {
    try {
      const certificate = version 
        ? await this.certificateClient.getCertificateVersion(certificateName, version)
        : await this.certificateClient.getCertificate(certificateName);

      if (!certificate.cer) {
        throw new Error(`Certificate ${certificateName} has no certificate data`);
      }

      // Parse certificate to extract information
      const certInfo = this.parseCertificateInfo(certificate.cer);

      return {
        name: certificate.name,
        version: certificate.properties.version || 'latest',
        thumbprint: certificate.properties.x509Thumbprint ? Buffer.from(certificate.properties.x509Thumbprint).toString('hex') : '',
        notBefore: certificate.properties.notBefore || new Date(),
        notAfter: certificate.properties.expiresOn || new Date(),
        subject: certInfo.subject,
        issuer: certInfo.issuer,
        keyUsage: certInfo.keyUsage,
        extendedKeyUsage: certInfo.extendedKeyUsage
      };
    } catch (error) {
      throw new Error(`Failed to get certificate info for ${certificateName}: ${error}`);
    }
  }

  /**
   * List certificates in the vault
   */
  async listCertificates(): Promise<string[]> {
    try {
      const certificates: string[] = [];
      const iterator = this.certificateClient.listPropertiesOfCertificates();
      
      for await (const cert of iterator) {
        if (cert.name) {
          certificates.push(cert.name);
        }
      }
      
      return certificates;
    } catch (error) {
      throw new Error(`Failed to list certificates: ${error}`);
    }
  }

  /**
   * Delete a certificate
   */
  async deleteCertificate(certificateName: string): Promise<OperationResult> {
    try {
      await this.certificateClient.beginDeleteCertificate(certificateName);
      return {
        success: true,
        message: `Certificate ${certificateName} deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete certificate ${certificateName}: ${error}`,
        error: error as Error
      };
    }
  }

  /**
   * Convert DER certificate to PEM format
   */
  private convertToPem(derData: Uint8Array, type: string): string {
    const base64 = Buffer.from(derData).toString('base64');
    const pem = base64.match(/.{1,64}/g)?.join('\n') || base64;
    return `-----BEGIN ${type}-----\n${pem}\n-----END ${type}-----`;
  }

  /**
   * Convert PEM certificate to DER format
   */
  private convertPemToDer(pemData: string): Uint8Array {
    const base64 = pemData
      .replace(/-----BEGIN [A-Z ]+-----/g, '')
      .replace(/-----END [A-Z ]+-----/g, '')
      .replace(/\s/g, '');
    
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }

  /**
   * Parse certificate information from DER data
   */
  private parseCertificateInfo(derData: Uint8Array): { subject: string; issuer: string; keyUsage: string[]; extendedKeyUsage: string[] } {
    // This is a simplified parser - in production, you might want to use a more robust ASN.1 parser
    // For now, return placeholder values
    return {
      subject: 'CN=Certificate Subject',
      issuer: 'CN=Certificate Issuer',
      keyUsage: ['digitalSignature', 'keyEncipherment'],
      extendedKeyUsage: ['serverAuth', 'clientAuth']
    };
  }
}
