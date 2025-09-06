#!/usr/bin/env ts-node

/**
 * Advanced usage example for the Azure Certificate Chain Tool
 * 
 * This example demonstrates how to create a certificate chain
 * with intermediate and root certificates.
 */

import { CertificateTool } from '../src/certificate-tool';
import { KeyVaultConfig, ChainConfig, AuthOptions } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Configuration for Azure Key Vault
  const config: KeyVaultConfig = {
    vaultUrl: process.env.AZURE_KEY_VAULT_URL || 'https://your-keyvault.vault.azure.net/',
    tenantId: process.env.AZURE_TENANT_ID || 'your-tenant-id',
    clientId: process.env.AZURE_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.AZURE_CLIENT_SECRET
  };

  // Authentication options
  const authOptions: AuthOptions = {
    useManagedIdentity: process.env.AZURE_USE_MANAGED_IDENTITY === 'true',
    useClientSecret: process.env.AZURE_USE_CLIENT_SECRET === 'true'
  };

  try {
    // Create tool instance
    console.log('🔧 Creating certificate tool instance...');
    const tool = new CertificateTool(config, authOptions);

    // Test connection
    console.log('🔍 Testing Key Vault connection...');
    const connectionResult = await tool.testConnection();
    if (!connectionResult.success) {
      throw new Error(`Connection failed: ${connectionResult.message}`);
    }
    console.log('✅ Connection successful!');

    // Example certificate names (modify these based on your Key Vault)
    const sourceCertName = 'my-source-certificate';
    const targetCertName = 'my-chained-certificate';

    // Check if source certificate exists
    console.log(`🔍 Checking if source certificate '${sourceCertName}' exists...`);
    const certificates = await tool.listCertificates();
    
    if (!certificates.includes(sourceCertName)) {
      console.log(`⚠️  Source certificate '${sourceCertName}' not found.`);
      console.log('Available certificates:', certificates);
      console.log('Please upload a source certificate first or modify the sourceCertName variable.');
      return;
    }

    // Load intermediate and root certificates from files (optional)
    const intermediateCerts: string[] = [];
    const rootCerts: string[] = [];

    // Example: Load intermediate certificates from files
    const intermediateDir = path.join(__dirname, 'certs', 'intermediate');
    const rootDir = path.join(__dirname, 'certs', 'root');

    try {
      if (fs.existsSync(intermediateDir)) {
        const intermediateFiles = fs.readdirSync(intermediateDir).filter(f => f.endsWith('.pem'));
        for (const file of intermediateFiles) {
          const certPath = path.join(intermediateDir, file);
          const certContent = fs.readFileSync(certPath, 'utf8');
          intermediateCerts.push(certContent);
          console.log(`📄 Loaded intermediate certificate: ${file}`);
        }
      }
    } catch (error) {
      console.log('ℹ️  No intermediate certificates directory found or error loading certificates');
    }

    try {
      if (fs.existsSync(rootDir)) {
        const rootFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.pem'));
        for (const file of rootFiles) {
          const certPath = path.join(rootDir, file);
          const certContent = fs.readFileSync(certPath, 'utf8');
          rootCerts.push(certContent);
          console.log(`📄 Loaded root certificate: ${file}`);
        }
      }
    } catch (error) {
      console.log('ℹ️  No root certificates directory found or error loading certificates');
    }

    // Configure certificate chain with intermediate and root certificates
    const chainConfig: ChainConfig = {
      sourceCertificateName: sourceCertName,
      targetCertificateName: targetCertName,
      intermediateCertificates: intermediateCerts.length > 0 ? intermediateCerts : undefined,
      rootCertificates: rootCerts.length > 0 ? rootCerts : undefined,
      validityPeriodDays: 365
    };

    console.log('🔗 Certificate chain configuration:');
    console.log(`  Source: ${chainConfig.sourceCertificateName}`);
    console.log(`  Target: ${chainConfig.targetCertificateName}`);
    console.log(`  Intermediate certificates: ${chainConfig.intermediateCertificates?.length || 0}`);
    console.log(`  Root certificates: ${chainConfig.rootCertificates?.length || 0}`);
    console.log(`  Validity period: ${chainConfig.validityPeriodDays} days`);

    // Create certificate chain
    console.log('🔗 Creating certificate chain...');
    const result = await tool.processCertificateChain(chainConfig);

    if (result.success) {
      console.log('✅ Certificate chain created successfully!');
      console.log(`📄 New certificate name: ${result.certificateName}`);

      // Get detailed information about the new certificate
      console.log('📋 Getting certificate information...');
      const certInfo = await tool.getCertificateDetails(targetCertName);
      
      console.log('\n📋 Certificate Details:');
      console.log(`  Name: ${certInfo.name}`);
      console.log(`  Version: ${certInfo.version}`);
      console.log(`  Subject: ${certInfo.subject}`);
      console.log(`  Issuer: ${certInfo.issuer}`);
      console.log(`  Valid From: ${certInfo.notBefore.toISOString()}`);
      console.log(`  Valid To: ${certInfo.notAfter.toISOString()}`);
      console.log(`  Thumbprint: ${certInfo.thumbprint}`);
      console.log(`  Key Usage: ${certInfo.keyUsage.join(', ')}`);
      console.log(`  Extended Key Usage: ${certInfo.extendedKeyUsage.join(', ')}`);

      // List all certificates to show the new one
      console.log('\n📋 Updated certificate list:');
      const updatedCertificates = await tool.listCertificates();
      updatedCertificates.forEach((cert, index) => {
        const marker = cert === targetCertName ? '🆕' : '📄';
        console.log(`  ${index + 1}. ${marker} ${cert}`);
      });

    } else {
      console.error('❌ Failed to create certificate chain:', result.message);
      if (result.error) {
        console.error('Error details:', result.error);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}
