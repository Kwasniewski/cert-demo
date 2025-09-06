import * as forge from 'node-forge';
import { CertificateData, ChainConfig } from './types';

/**
 * Certificate chain builder for creating chained certificates
 */
export class CertificateChainBuilder {
  /**
   * Create a certificate chain from a source certificate and additional certificates
   */
  async createCertificateChain(
    sourceCertificate: CertificateData,
    config: ChainConfig
  ): Promise<CertificateData> {
    try {
      // Parse the source certificate
      const sourceCert = this.parsePemCertificate(sourceCertificate.certificate);

      // Create a new certificate based on the source
      const newCert = await this.createNewCertificate(sourceCert, config);
      console.log('New certificate:', newCert);
      // Build the certificate chain
      const chain = await this.buildChain(newCert, config);
      
      // Convert to PEM format
      const pemChain = this.convertChainToPem(chain);
      
      return {
        certificate: pemChain,
        privateKey: sourceCertificate.privateKey,
        chain: chain.map(cert => this.convertToPem(cert))
      };
    } catch (error) {
      throw new Error(`Failed to create certificate chain: ${error}`);
    }
  }

  /**
   * Parse a PEM certificate string into a forge certificate object
   */
  private parsePemCertificate(pemData: string): forge.pki.Certificate {
    try {
      return forge.pki.certificateFromPem(pemData);
    } catch (error) {
      throw new Error(`Failed to parse PEM certificate: ${error}`);
    }
  }

  /**
   * Create a new certificate based on the source certificate
   */
  private async createNewCertificate(
    sourceCert: forge.pki.Certificate,
    config: ChainConfig
  ): Promise<forge.pki.Certificate> {
    // Generate a new key pair
    const keyPair = forge.pki.rsa.generateKeyPair(2048);
    
    // Create a new certificate
    const newCert = forge.pki.createCertificate();
    
    // Set certificate properties based on source certificate
    newCert.publicKey = keyPair.publicKey;
    newCert.serialNumber = this.generateSerialNumber();
    
    // Set validity period
    const now = new Date();
    const validityDays = config.validityPeriodDays || 365;
    newCert.validity.notBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day before
    newCert.validity.notAfter = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
    
    // Set subject (you can customize this based on your needs)
    newCert.subject = this.createSubject(config.targetCertificateName);
    
    // Set issuer (same as subject for self-signed, or use source certificate's issuer)
    newCert.issuer = sourceCert.issuer;
    
    // Set extensions
    newCert.setExtensions([
      {
        name: 'basicConstraints',
        cA: false,
        pathLenConstraint: 3
      },
      {
        name: 'keyUsage',
        digitalSignature: true,
        keyEncipherment: true,
        dataEncipherment: true
      },
      {
        name: 'extKeyUsage',
        serverAuth: true,
        clientAuth: true
      },
      {
        name: 'subjectAltName',
        altNames: [{
          type: 2, // DNS
          value: config.targetCertificateName
        }]
      }
    ]);

    // Sign the certificate with the source certificate's private key
    // Note: In a real scenario, you'd need access to the private key
    // For this demo, we'll create a self-signed certificate
    newCert.sign(keyPair.privateKey);
    console.log('Signed certificate:', newCert);
    
    return newCert;
  }

  /**
   * Build the certificate chain
   */
  private async buildChain(
    newCert: forge.pki.Certificate,
    config: ChainConfig
  ): Promise<forge.pki.Certificate[]> {
    const chain: forge.pki.Certificate[] = [newCert];
    
    // Add intermediate certificates if provided
    if (config.intermediateCertificates) {
      for (const intermediatePem of config.intermediateCertificates) {
        try {
          const intermediateCert = this.parsePemCertificate(intermediatePem);
          chain.push(intermediateCert);
        } catch (error) {
          console.warn(`Failed to parse intermediate certificate: ${error}`);
        }
      }
    }
    
    // Add root certificates if provided
    if (config.rootCertificates) {
      for (const rootPem of config.rootCertificates) {
        try {
          const rootCert = this.parsePemCertificate(rootPem);
          chain.push(rootCert);
        } catch (error) {
          console.warn(`Failed to parse root certificate: ${error}`);
        }
      }
    }
    
    return chain;
  }

  /**
   * Convert certificate chain to PEM format
   */
  private convertChainToPem(chain: forge.pki.Certificate[]): string {
    return chain.map(cert => this.convertToPem(cert)).join('\n');
  }

  /**
   * Convert a single certificate to PEM format
   */
  private convertToPem(cert: forge.pki.Certificate): string {
    return forge.pki.certificateToPem(cert);
  }

  /**
   * Create subject for the new certificate
   */
  private createSubject(certificateName: string): any {
    const subject = [{
      name: 'commonName',
      value: certificateName
    }];
    
    // Create a proper subject object that matches forge.pki.Certificate subject structure
    return {
      attributes: subject,
      getField: (sn: string) => subject.find(field => field.name === sn),
      addField: (attr: any) => subject.push(attr),
      hash: null
    };
  }

  /**
   * Generate a unique serial number
   */
  private generateSerialNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return timestamp + random;
  }

  /**
   * Validate certificate chain
   */
  async validateCertificateChain(chain: forge.pki.Certificate[]): Promise<boolean> {
    try {
      if (chain.length === 0) {
        return false;
      }
      
      // Check if each certificate in the chain is valid
      for (let i = 0; i < chain.length; i++) {
        const cert = chain[i];
        const now = new Date();
        
        // Check validity period
        if (cert.validity.notBefore > now || cert.validity.notAfter < now) {
          console.warn(`Certificate at index ${i} is not valid at current time`);
          return false;
        }
        
        // Check if this is not the last certificate (root)
        if (i < chain.length - 1) {
          const nextCert = chain[i + 1];
          
          // Verify that the issuer of current cert matches subject of next cert
          if (!this.compareDistinguishedNames(cert.issuer.attributes, nextCert.subject.attributes)) {
            console.warn(`Certificate chain broken at index ${i}`);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Certificate chain validation failed: ${error}`);
      return false;
    }
  }

  /**
   * Compare two distinguished names
   */
  private compareDistinguishedNames(dn1: forge.pki.CertificateField[], dn2: forge.pki.CertificateField[]): boolean {
    if (dn1.length !== dn2.length) {
      return false;
    }
    
    for (let i = 0; i < dn1.length; i++) {
      if (dn1[i].name !== dn2[i].name || dn1[i].value !== dn2[i].value) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Extract certificate information
   */
  extractCertificateInfo(cert: forge.pki.Certificate): {
    subject: string;
    issuer: string;
    serialNumber: string;
    notBefore: Date;
    notAfter: Date;
    fingerprint: string;
  } {
    return {
      subject: this.distinguishedNameToString(cert.subject.attributes),
      issuer: this.distinguishedNameToString(cert.issuer.attributes),
      serialNumber: cert.serialNumber,
      notBefore: cert.validity.notBefore,
      notAfter: cert.validity.notAfter,
      fingerprint: forge.md.sha1.create().update(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()).digest().toHex()
    };
  }

  /**
   * Convert distinguished name to string
   */
  private distinguishedNameToString(dn: forge.pki.CertificateField[]): string {
    return dn.map(field => `${field.name}=${field.value}`).join(', ');
  }
}
