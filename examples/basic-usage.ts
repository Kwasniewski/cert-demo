#!/usr/bin/env ts-node

/**
 * Basic usage example for the Azure Certificate Chain Tool
 * 
 * This example demonstrates how to use the tool programmatically
 * to create a certificate chain from a source certificate.
 */

import { CertificateTool } from '../src/certificate-tool';
import { KeyVaultConfig, ChainConfig, AuthOptions } from '../src/types';

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

    // List existing certificates
    console.log('📋 Listing existing certificates...');
    const certificates = await tool.listCertificates();
    console.log(`Found ${certificates.length} certificates:`, certificates);

    if (certificates.length === 0) {
      console.log('⚠️  No certificates found. Please upload a source certificate first.');
      return;
    }

    // Use the first certificate as source (you can modify this logic)
    const sourceCertName = certificates[0];
    const targetCertName = `${sourceCertName}-chained`;

    // Configure certificate chain
    const chainConfig: ChainConfig = {
      sourceCertificateName: sourceCertName,
      targetCertificateName: targetCertName,
      validityPeriodDays: 365
    };

    // Create certificate chain
    console.log(`🔗 Creating certificate chain from '${sourceCertName}' to '${targetCertName}'...`);
    const result = await tool.processCertificateChain(chainConfig);

    if (result.success) {
      console.log('✅ Certificate chain created successfully!');
      console.log(`📄 New certificate name: ${result.certificateName}`);

      // Get information about the new certificate
      console.log('📋 Getting certificate information...');
      const certInfo = await tool.getCertificateDetails(targetCertName);
      console.log('Certificate Details:');
      console.log(`  Subject: ${certInfo.subject}`);
      console.log(`  Issuer: ${certInfo.issuer}`);
      console.log(`  Valid From: ${certInfo.notBefore.toISOString()}`);
      console.log(`  Valid To: ${certInfo.notAfter.toISOString()}`);
      console.log(`  Thumbprint: ${certInfo.thumbprint}`);
    } else {
      console.error('❌ Failed to create certificate chain:', result.message);
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
