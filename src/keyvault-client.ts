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
import { KeyVaultConfig, CertificateInfo, CertificateData, OperationResult, AuthOptions, RootCAConfig, IntermediateCAConfig, EndEntityCertConfig, CertificateCreationResult } from './types';
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
      // Create certificate policy if not provided
      const certPolicy = policy || {
        issuerName: 'Self',
        subject: 'CN=Test Certificate',
        keyType: 'RSA',
        keySize: 2048,
        exportable: true,
        keyUsage: ['digitalSignature', 'keyEncipherment'],
        validityInMonths: 12
      };
      const cert = Buffer.from(certificateData.privateKey + certificateData.certificate, 'base64');
      // Import the certificate
      const result = await this.certificateClient.importCertificate(certificateName, cert, certPolicy);
      
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

  /**
   * Create a new root CA certificate
   */
  async createRootCA(config: RootCAConfig): Promise<CertificateCreationResult> {
    try {
      const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair(config.keySize || 4096);
      const cert = forge.pki.createCertificate();
      
      cert.publicKey = publicKey;
      cert.privateKey = privateKey;
      cert.serialNumber = this.generateSerialNumber();
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + (config.validityDays || 3650) / 365);
      
      // Set subject and issuer (same for root CA)
      cert.setSubject(this.parseSubject(config.subject));
      cert.setIssuer(this.parseSubject(config.subject));

      // Set extensions for root CA
      cert.setExtensions([
        {
          name: 'basicConstraints',
          cA: true,
          pathLenConstraint: config.pathLength || 0
        },
        {
          name: 'keyUsage',
          keyCertSign: true,
          cRLSign: true
        },
        {
          name: 'subjectKeyIdentifier'
        },
        {
          name: 'authorityKeyIdentifier',
          keyIdentifier: true
        }
      ]);

      // Sign the certificate with its own private key
      cert.sign(privateKey);

      // Convert to PEM format
      const pemCert = forge.pki.certificateToPem(cert);
      const pemKey = forge.pki.privateKeyToPem(privateKey);
      
      const certificateData: CertificateData = {
        certificate: pemCert,
        privateKey: pemKey
      };
      
      // Upload to Key Vault
      const uploadResult = await this.uploadCertificate(config.name, certificateData);
      
      if (uploadResult.success) {
        return {
          success: true,
          message: `Root CA ${config.name} created successfully`,
          certificateName: config.name,
          certificateData: certificateData,
          thumbprint: this.getThumbprint(cert)
        };
      } else {
        return {
          success: false,
          message: `Failed to upload root CA ${config.name}: ${uploadResult.message}`,
          certificateName: config.name,
          error: uploadResult.error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to create root CA ${config.name}: ${error}`,
        certificateName: config.name,
        error: error as Error
      };
    }
  }

  /**
   * Create a new intermediate CA certificate
   */
  async createIntermediateCA(config: IntermediateCAConfig): Promise<CertificateCreationResult> {
    try {
      // Get the issuer CA certificate and private key
      const issuerData = await this.downloadCertificateWithPrivateKey(config.issuerCA);
      if (!issuerData.privateKey) {
        throw new Error(`Private key not available for issuer CA ${config.issuerCA}`);
      }
      
      const issuerCert = forge.pki.certificateFromPem(issuerData.certificate);
      const issuerPrivateKey = forge.pki.privateKeyFromPem(issuerData.privateKey);
      
      // Generate new key pair for intermediate CA
      const keyPair = forge.pki.rsa.generateKeyPair(config.keySize || 4096);
      const cert = forge.pki.createCertificate();
      
      cert.publicKey = keyPair.publicKey;
      cert.serialNumber = this.generateSerialNumber();
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + (config.validityDays || 1825) / 365);
      
      // Set subject and issuer
      cert.setSubject(this.parseSubject(config.subject));
      cert.setIssuer(this.parseSubject(config.subject));
      
      // Set extensions for intermediate CA
      cert.setExtensions([
        {
          name: 'basicConstraints',
          cA: true,
          pathLenConstraint: config.pathLength || 0
        },
        {
          name: 'keyUsage',
          keyCertSign: true,
          cRLSign: true
        },
        {
          name: 'subjectKeyIdentifier'
        },
        {
          name: 'authorityKeyIdentifier',
          keyIdentifier: true,
          authorityCertIssuer: true,
          serialNumber: issuerCert.serialNumber
        }
      ]);
      
      // Sign the certificate with the issuer's private key
      cert.sign(issuerPrivateKey);
      
      // Convert to PEM format
      const pemCert = forge.pki.certificateToPem(cert);
      const pemKey = forge.pki.privateKeyToPem(keyPair.privateKey);
      
      const certificateData: CertificateData = {
        certificate: pemCert,
        privateKey: pemKey
      };
      
      // Upload to Key Vault
      const uploadResult = await this.uploadCertificate(config.name, certificateData);
      
      if (uploadResult.success) {
        return {
          success: true,
          message: `Intermediate CA ${config.name} created successfully`,
          certificateName: config.name,
          certificateData: certificateData,
          thumbprint: this.getThumbprint(cert)
        };
      } else {
        return {
          success: false,
          message: `Failed to upload intermediate CA ${config.name}: ${uploadResult.message}`,
          certificateName: config.name,
          error: uploadResult.error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to create intermediate CA ${config.name}: ${error}`,
        certificateName: config.name,
        error: error as Error
      };
    }
  }

  /**
   * Create a new end-entity certificate
   */
  async createEndEntityCertificate(config: EndEntityCertConfig): Promise<CertificateCreationResult> {
    try {
      // Get the issuer CA certificate and private key
      const issuerData = await this.downloadCertificateWithPrivateKey(config.issuerCA);
      if (!issuerData.privateKey) {
        throw new Error(`Private key not available for issuer CA ${config.issuerCA}`);
      }
      
      const issuerCert = forge.pki.certificateFromPem(issuerData.certificate);
      const issuerPrivateKey = forge.pki.privateKeyFromPem(issuerData.privateKey);
      
      // Generate new key pair for end-entity certificate
      const keyPair = forge.pki.rsa.generateKeyPair(config.keySize || 2048);
      const cert = forge.pki.createCertificate();
      
      cert.publicKey = keyPair.publicKey;
      cert.serialNumber = this.generateSerialNumber();
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + (config.validityDays || 365) / 365);
      
      // Set subject and issuer
      cert.setSubject(this.parseSubject(config.subject));
      cert.setIssuer(this.parseSubject(config.subject));
      
      // Set extensions for end-entity certificate
      const extensions: any[] = [
        {
          name: 'basicConstraints',
          cA: false
        },
        {
          name: 'keyUsage',
          digitalSignature: true,
          keyEncipherment: true
        },
        {
          name: 'subjectKeyIdentifier'
        },
        {
          name: 'authorityKeyIdentifier',
          keyIdentifier: true,
          authorityCertIssuer: true,
          serialNumber: issuerCert.serialNumber
        }
      ];
      
      // Add extended key usage if specified
      if (config.extendedKeyUsage && config.extendedKeyUsage.length > 0) {
        extensions.push({
          name: 'extKeyUsage',
          serverAuth: config.extendedKeyUsage.includes('serverAuth'),
          clientAuth: config.extendedKeyUsage.includes('clientAuth'),
          codeSigning: config.extendedKeyUsage.includes('codeSigning'),
          emailProtection: config.extendedKeyUsage.includes('emailProtection'),
          timeStamping: config.extendedKeyUsage.includes('timeStamping')
        });
      }
      
      // Add Subject Alternative Names if specified
      if (config.san && config.san.length > 0) {
        extensions.push({
          name: 'subjectAltName',
          altNames: config.san.map(name => ({
            type: name.includes('@') ? 1 : 2, // 1 = email, 2 = DNS
            value: name
          }))
        });
      }
      
      cert.setExtensions(extensions);
      
      // Sign the certificate with the issuer's private key
      cert.sign(issuerPrivateKey);
      
      // Convert to PEM format
      const pemCert = forge.pki.certificateToPem(cert);
      const pemKey = forge.pki.privateKeyToPem(keyPair.privateKey);
      
      const certificateData: CertificateData = {
        certificate: pemCert,
        privateKey: pemKey
      };
      
      // Upload to Key Vault
      const uploadResult = await this.uploadCertificate(config.name, certificateData);
      
      if (uploadResult.success) {
        return {
          success: true,
          message: `End-entity certificate ${config.name} created successfully`,
          certificateName: config.name,
          certificateData: certificateData,
          thumbprint: this.getThumbprint(cert)
        };
      } else {
        return {
          success: false,
          message: `Failed to upload end-entity certificate ${config.name}: ${uploadResult.message}`,
          certificateName: config.name,
          error: uploadResult.error
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to create end-entity certificate ${config.name}: ${error}`,
        certificateName: config.name,
        error: error as Error
      };
    }
  }

  /**
   * Helper method to generate a random serial number
   */
  private generateSerialNumber(): string {
    return forge.util.bytesToHex(forge.random.getBytesSync(16));
  }

  /**
   * Helper method to parse subject string into forge format
   */
  private parseSubject(subject: string): any {
    const attrs: any[] = [];
    const parts = subject.split(',');
    
    for (const part of parts) {
      const [key, value] = part.trim().split('=');
      if (key && value) {
        switch (key.toUpperCase()) {
          case 'CN':
            attrs.push({ shortName: 'CN', value: value });
            break;
          case 'O':
            attrs.push({ shortName: 'O', value: value });
            break;
          case 'OU':
            attrs.push({ shortName: 'OU', value: value });
            break;
          case 'C':
            attrs.push({ shortName: 'C', value: value });
            break;
          case 'ST':
            attrs.push({ shortName: 'ST', value: value });
            break;
          case 'L':
            attrs.push({ shortName: 'L', value: value });
            break;
          case 'E':
          case 'EMAILADDRESS':
            attrs.push({ shortName: 'E', value: value });
            break;
        }
      }
    }
    
    return attrs;
  }

  /**
   * Helper method to get certificate thumbprint
   */
  private getThumbprint(cert: any): string {
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const md = forge.md.sha1.create();
    md.update(der);
    return md.digest().toHex();
  }
}
