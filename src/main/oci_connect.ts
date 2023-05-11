/* eslint-disable no-console */
// OCI SDK
import * as common from 'oci-common';
import * as core from 'oci-core';
import * as identity from 'oci-identity';
import * as keyManagement from 'oci-keymanagement';
import * as responses from 'oci-core/lib/response';
import * as vault from 'oci-vault';
import * as secrets from 'oci-secrets';
import * as workrequests from 'oci-workrequests';
import { LOG } from 'oci-sdk';
import * as fs from 'fs';
import os from 'os';
import { createPublicKey } from 'crypto';

const bunyan = require('bunyan');

const bunLog = bunyan.createLogger({ name: 'OCIConnect', level: 'debug' });
LOG.logger = bunLog;

const crypto = require('crypto');
const sshpk = require('sshpk');

const filePath = `${os.homedir()}/.oci/config`;
const keyPath = `${os.homedir()}/.oci/keys/`;

export class OCIConnect {
  computeClient: core.ComputeClient;

  clientManagement: core.ComputeManagementClient;

  identityClient: identity.IdentityClient;

  keyClient: keyManagement.KmsManagementClient;

  keyCryptoClient: keyManagement.KmsCryptoClient;

  vaultsClient: vault.VaultsClient;

  secretClient: secrets.SecretsClient;

  virtualNetworkClient: core.VirtualNetworkClient;

  workRequestClient: workrequests.WorkRequestClient;

  profileName: string;

  filePath: string;

  OCID: string;

  userCompartment: string;

  vaultCompartment: string;

  nephosCompartment: string;

  constructor(profileName: string) {
    this.profileName = profileName;
    this.filePath = filePath;
    this.OCID = '';
    this.userCompartment = '';

    const provider = new common.ConfigFileAuthenticationDetailsProvider(
      this.filePath,
      this.profileName
    );

    // Create a new ComputeClient
    this.computeClient = new core.ComputeClient({
      authenticationDetailsProvider: provider,
    });

    this.clientManagement = new core.ComputeManagementClient({
      authenticationDetailsProvider: provider,
    });

    this.identityClient = new identity.IdentityClient({
      authenticationDetailsProvider: provider,
    });

    this.keyClient = new keyManagement.KmsManagementClient({
      authenticationDetailsProvider: provider,
    });

    this.keyCryptoClient = new keyManagement.KmsCryptoClient({
      authenticationDetailsProvider: provider,
    });

    this.vaultsClient = new vault.VaultsClient({
      authenticationDetailsProvider: provider,
    });

    this.secretClient = new secrets.SecretsClient({
      authenticationDetailsProvider: provider,
    });

    this.virtualNetworkClient = new core.VirtualNetworkClient({
      authenticationDetailsProvider: provider,
    });

    this.workRequestClient = new workrequests.WorkRequestClient({
      authenticationDetailsProvider: provider,
    });

    this.keyClient.endpoint =
      'https://d5seppcnaaggq-management.kms.uk-london-1.oraclecloud.com';

    this.keyCryptoClient.endpoint =
      'https://d5seppcnaaggq-crypto.kms.uk-london-1.oraclecloud.com';

    this.vaultCompartment =
      'ocid1.vault.oc1.uk-london-1.d5seppcnaaggq.abwgiljsjjkkpibzs3gv4rqr2nsykyqwk4gubtrunqnaqihvcr2srgtzxqva';

    this.nephosCompartment =
      'ocid1.compartment.oc1..aaaaaaaa3dfdzabug5l5ymsmgctlnabppmn2umgloy5uja2ppwr2m4aqe6wq';
  }

  getProfileName() {
    return this.profileName;
  }

  getFilePath() {
    return this.filePath;
  }

  getOCID() {
    return this.OCID;
  }

  getUserCompartment() {
    return this.userCompartment;
  }

  setUserCompartment(compartment: string) {
    this.userCompartment = compartment;
  }

  // Work Requests
  async getWorkRequestStatus(workRequestId: string): Promise<string> {
    /**
     * Returns the status of a work request
     * @param workRequestId
     * @returns workRequest
     * @example
     * const workRequest = await getWorkRequest(workRequestId);
     * console.log(workRequest);
     * */
    const request: workrequests.requests.GetWorkRequestRequest = {
      workRequestId,
    };
    const response = await this.workRequestClient.getWorkRequest(request);
    return response.workRequest.status;
  }

  // Instance functions
  async listUserInstances(): Promise<core.models.Instance[]> {
    // creating request object
    const request: core.requests.ListInstancesRequest = {
      compartmentId: this.userCompartment,
    };
    // sending request to client
    const response = await this.computeClient.listInstances(request);
    return response.items;
  }

  async startInstance(instanceId: string): Promise<core.models.Instance> {
    const request: core.requests.InstanceActionRequest = {
      instanceId,
      action: core.requests.InstanceActionRequest.Action.Start,
    };

    const response = (await this.computeClient.instanceAction(request))
      .instance;
    return response;
  }

  async stopInstance(
    instanceId: string
  ): Promise<responses.InstanceActionResponse> {
    const request: core.requests.InstanceActionRequest = {
      instanceId,
      action: core.requests.InstanceActionRequest.Action.Softstop,
    };

    const response: core.responses.InstanceActionResponse =
      await this.computeClient.instanceAction(request);
    return response;
  }

  async moveInstance(
    instanceId: string,
    compartmentId: string
  ): Promise<string> {
    /**
     * Moves an instance to a different compartment
     * @param instanceId
     * @param compartmentId
     * @returns opcWorkRequestId
     * @example
     * const workRequestId = await moveInstance(instanceId, compartmentId);
     * const workRequest = await getWorkRequest(workRequestId);
     * console.log(workRequest);
     *  */
    const request: core.requests.ChangeInstanceCompartmentRequest = {
      instanceId,
      changeInstanceCompartmentDetails: {
        compartmentId,
      },
    };

    const response: core.responses.ChangeInstanceCompartmentResponse =
      await this.computeClient.changeInstanceCompartment(request);
    return response.opcWorkRequestId;
  }

  async instanceStatus(instanceId: string): Promise<string> {
    /**
     * Returns the status of the instance. Status can be:
     * - PROVISIONING
     * - RUNNING
     * - STARTING
     * - STOPPING
     * - STOPPED
     * - CREATING_IMAGE
     * - TERMINATING
     * - TERMINATED
     * @param instanceId
     * @returns string
     * @example
     * const instanceStatus = await instanceStatus(instanceId);
     */
    const request: core.requests.GetInstanceRequest = {
      instanceId,
    };

    const response: core.responses.GetInstanceResponse =
      await this.computeClient.getInstance(request);
    return response.instance.lifecycleState;
  }

  async getInstanceIP(instanceId: string): Promise<string> {
    /**
     * Returns the public IP of the instance
     * @param instanceId
     * @returns string
     * @example
     * const instanceIP = await getInstanceIP(instanceId);
     * console.log(instanceIP);
     */
    // list VNIC attachments

    const request: core.requests.ListVnicAttachmentsRequest = {
      compartmentId: this.userCompartment,
      instanceId,
    };

    const response: core.responses.ListVnicAttachmentsResponse =
      await this.computeClient.listVnicAttachments(request);

    console.log(response);
    console.log(response.items[0]);

    if (response.items.length === 0) {
      throw new Error('VNIC not found');
    }
    if (response.items.length > 1) {
      throw new Error('More than one VNIC found');
    }
    const { vnicId } = response.items[0];

    if (!vnicId) {
      throw new Error('VNIC ID not found');
    }
    // get VNIC with the OCID
    const vnicRequest: core.requests.GetVnicRequest = {
      vnicId,
    };

    const vnicResponse: core.responses.GetVnicResponse =
      await this.virtualNetworkClient.getVnic(vnicRequest);

    const { publicIp } = vnicResponse.vnic;

    if (!publicIp) {
      throw new Error('Public IP not found');
    }

    return publicIp;
  }

  // Teriminate instance
  async terminateInstance(
    instanceId: string
  ): Promise<responses.TerminateInstanceResponse> {
    const request: core.requests.TerminateInstanceRequest = {
      instanceId,
    };
    const response: core.responses.TerminateInstanceResponse =
      await this.computeClient.terminateInstance(request);
    return response;
  }

  // Oracle Vault functions
  async createSecret(
    secretContent: string,
    secretName: string,
    keyId: string = 'ocid1.key.oc1.uk-london-1.d5seppcnaaggq.abwgiljtbcrfrbyv3b62nejurali7upcvovgrtpeqx7svt7yjb6k5s2qffpa',
    compartmentId: string = this.nephosCompartment,
    vaultId: string = this.vaultCompartment
  ): Promise<vault.models.Secret> {
    /**
    Creates a secret in the vault with the given secret content.
    The secret content is converted to base64 and then stored in the vault.

    @param secretContent: The secret content that will be stored in the vault.
    @param secretName: The name of the secret that will be created.
    @param keyId: The OCID Key id that will be used to encrypt the secret content. If not specified uses default Key OCID
    @param compartmentId: Compartment id where the secret will be created. If not specified uses default Nephos Compartment
    @param vaultId: The vault id where the secret will be created. If not specified uses default Vault

    @returns secret object that was created.
    */

    // converting secret content to base64
    const b64Content = Buffer.from(secretContent, 'utf8').toString('base64');
    const secretContentBase64: vault.models.Base64SecretContentDetails = {
      contentType: 'BASE64',
      content: b64Content,
    };

    const createSecretDetails: vault.models.CreateSecretDetails = {
      compartmentId,
      secretContent: secretContentBase64,
      secretName,
      keyId,
      vaultId,
    };
    const request: vault.requests.CreateSecretRequest = {
      createSecretDetails,
    };
    const response: vault.responses.CreateSecretResponse =
      await this.vaultsClient.createSecret(request);

    return response.secret;
  }

  async getSecretContent(secretName: string): Promise<string> {
    /**
     * Gets the secret content from the vault with the given secret name.
     * @param secretName: The secret name of the secret object that will be retrieved.
     * @returns Decoded (if BASE64) content that was retrieved.
     * */
    const request: secrets.requests.GetSecretBundleByNameRequest = {
      secretName,
      vaultId: this.vaultCompartment,
    };
    const response: secrets.responses.GetSecretBundleByNameResponse =
      await this.secretClient.getSecretBundleByName(request);

    const secretContent: string = response.secretBundle.secretBundleContent
      ?.content as string;

    // decoding base64 secret content
    if (response.secretBundle.secretBundleContent?.contentType === 'BASE64') {
      return Buffer.from(secretContent, 'base64').toString('utf8');
    }
    return secretContent;
  }

  async deleteSecret(secretName: string): Promise<void> {
    /**
     * Deletes the secret from the vault with the given secret name.
     * @param secretName: The secret name of the secret object that will be deleted.
     * */

    const secretId = await this.getSecretId(secretName);
    const details: vault.models.ScheduleSecretDeletionDetails = {
      // set time of deletion to 1 day from now
      timeOfDeletion: new Date(Date.now() + 25 * 60 * 60 * 1000),
    };
    const request: vault.requests.ScheduleSecretDeletionRequest = {
      secretId,
      scheduleSecretDeletionDetails: details,
    };
    await this.vaultsClient.scheduleSecretDeletion(request);
  }

  async getSecretId(secretName: string): Promise<string> {
    /**
     * Gets the secret id from the vault with the given secret name.
     * @param secretName: The secret name of the secret object that will be retrieved.
     * @returns secret id that was retrieved.
     * */

    const request: secrets.requests.GetSecretBundleByNameRequest = {
      secretName,
      vaultId: this.vaultCompartment,
    };
    const response: secrets.responses.GetSecretBundleByNameResponse =
      await this.secretClient.getSecretBundleByName(request);

    return response.secretBundle.secretId;
  }

  async listSSHKeys(): Promise<keyManagement.models.KeySummary[]> {
    const request: keyManagement.requests.ListKeysRequest = {
      compartmentId:
        'ocid1.compartment.oc1..aaaaaaaa3dfdzabug5l5ymsmgctlnabppmn2umgloy5uja2ppwr2m4aqe6wq',
    };
    const response = await this.keyClient.listKeys(request);
    return response.items;
  }

  async getSSHKey(keyId: string): Promise<keyManagement.models.Key> {
    const request: keyManagement.requests.GetKeyRequest = {
      keyId,
    };

    const response = await this.keyClient.getKey(request);
    return response.key;
  }

  // Instance configuration functions
  // getting list of all instance configs
  async listInstanceConfigurations(): Promise<
    core.models.InstanceConfigurationSummary[]
  > {
    /**
     * Get the list of all instance configurations for the given compartment id.
     *
     * @param compartmentId: string
     * @return instanceConfigurations: core.models.InstanceConfigurationSummary[]
     *
     */
    // creating request object
    const request: core.requests.ListInstanceConfigurationsRequest = {
      compartmentId:
        'ocid1.compartment.oc1..aaaaaaaamowsqxoe4apfqwhqdxp6s4b4222s5eqqpt3a4fegjorekzkw3wta',
    };

    // sending request to client
    const response = await this.clientManagement.listInstanceConfigurations(
      request
    );
    return response.items;
  }

  async getInstanceConfig(
    configId: string
  ): Promise<core.models.InstanceConfiguration> {
    /**
     * Get the instance configuration details for the given instance configuration id.
     *
     * @param configId - The OCID of the instance configuration.
     * @return instanceConfiguration - The instance configuration details.
     * @throws Exception
     *
     * Example:
     *  const instanceConfiguration = await getInstanceConfig(configId);
     *
     * console.log('Instance Configuration Details: ', instanceConfiguration);
     *
     */
    // Create a request and dependent object(s).
    const getInstanceConfigurationRequest: core.requests.GetInstanceConfigurationRequest =
      {
        instanceConfigurationId: configId,
      };

    // Send request to the Client.
    const getInstanceConfigurationResponse: core.responses.GetInstanceConfigurationResponse =
      await this.clientManagement.getInstanceConfiguration(
        getInstanceConfigurationRequest
      );
    return getInstanceConfigurationResponse.instanceConfiguration;
  }

  async launchInstanceFromConfig(
    instanceConfigurationId: string,
    displayName: string,
    publicKey: string
  ): Promise<core.models.Instance> {
    /**
     * Launches an instance from the given instance configuration id.
     * @param instanceConfigurationId: The OCID of the instance configuration.
     * @param displayName: The display name of the instance that will be launched.
     * @param publicKey: The public key that will be used to access the instance.
     * @return instance: The instance that was launched.
     * @throws Exception
     * Example:
     * const instance = await launchInstanceFromConfig(instanceConfigurationId, publicKey);
     * console.log('Instance Launched: ', instance);
     * */
    const instanceConfig: core.models.InstanceConfiguration =
      await this.getInstanceConfig(instanceConfigurationId);

    console.log('Instance Config: ', instanceConfig);

    const instanceDetails: core.models.ComputeInstanceDetails = {
      instanceType: 'compute',
      launchDetails: {
        displayName,
      },
    };

    instanceDetails!.launchDetails!.displayName = displayName;

    instanceDetails!.launchDetails!.metadata = {
      ssh_authorized_keys: `${publicKey}`,
    };

    const request: core.requests.LaunchInstanceConfigurationRequest = {
      instanceConfigurationId,
      instanceConfiguration: instanceDetails,
    };
    console.log('Request: ', request);
    console.log('definedTags', instanceDetails!.launchDetails!.definedTags);
    console.log('metadata', instanceDetails!.launchDetails!.metadata);
    const response: core.responses.LaunchInstanceConfigurationResponse =
      await this.clientManagement.launchInstanceConfiguration(request);
    return response.instance;
  }

  // User management functions
  async addApiKeyToUser(
    key: string,
    user: string
  ): Promise<identity.models.ApiKey> {
    try {
      const apiKey: identity.models.CreateApiKeyDetails = {
        key,
      };
      const request: identity.requests.UploadApiKeyRequest = {
        createApiKeyDetails: apiKey,
        userId: user,
      };
      const response = await this.identityClient.uploadApiKey(request);

      return response.apiKey;
    } catch (error) {
      console.log('Error in addApiKeyToUser ', error);
      throw error;
    }
  }

  async getUserOCID(user: string) {
    const request: identity.requests.ListUsersRequest = {
      compartmentId:
        'ocid1.tenancy.oc1..aaaaaaaax25zqrammapt7upslefqq3kv6dzilt6z55yobnf2cmrn3tcimgpa',
      identityProviderId:
        'ocid1.saml2idp.oc1..aaaaaaaace5zv3qqzb6ycrvbvmto4uhjyfmsrqkveiq4pa5rvh7jcjg7fpzq',
    };
    const response: identity.responses.ListUsersResponse =
      await this.identityClient.listUsers(request);
    for (let i = 0; i < response.items.length; i += 1) {
      if (response.items[i].description === user) {
        this.OCID = response.items[i].id;
        return response.items[i].id;
      }
    }
    throw new Error('User not found');
  }

  // Compartment management functions
  // Check if compartment exists
  async findUserCompartment(
    profileName: string
  ): Promise<identity.models.Compartment | undefined> {
    const compartmentName = profileName.replace(/[^\w-]/g, '');
    const request: identity.requests.ListCompartmentsRequest = {
      compartmentId:
        'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
      name: compartmentName,
    };
    const response: identity.responses.ListCompartmentsResponse =
      await this.identityClient.listCompartments(request);
    if (response.items.length === 0) {
      return undefined;
    }
    return response.items[0];
  }

  // Create a new compartment
  async createCompartment(
    profileName: string
  ): Promise<identity.models.Compartment> {
    const compartmentName = `${profileName}`.replace(/[^\w-]/g, '');
    const compartment: identity.models.CreateCompartmentDetails = {
      compartmentId:
        'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
      name: compartmentName,
      description: `Nephos generated compartment for ${compartmentName}`,
    };
    const request: identity.requests.CreateCompartmentRequest = {
      createCompartmentDetails: compartment,
    };
    const response: identity.responses.CreateCompartmentResponse =
      await this.identityClient.createCompartment(request);
    return response.compartment;
  }

  // Group management functions
  // Check if group exists
  async groupExists() {
    const groupName = this.profileName;
    const request: identity.requests.ListGroupsRequest = {
      compartmentId:
        'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
      name: groupName,
    };
    const response: identity.responses.ListGroupsResponse =
      await this.identityClient.listGroups(request);
    if (response.items.length > 0) {
      return true;
    }
    return false;
  }
}

// Creates a new local profile in the config file
export function CreateProfile(
  userName: string,
  userOCID: string,
  fingerprint: string,
  tenancy: string,
  region: string,
  KeyFile: string
): boolean {
  const config = `\r\n[${userName}]
  user=${userOCID}\r
  fingerprint=${fingerprint}\r
  tenancy=${tenancy}\r
  region=${region}\r
  key_file=${keyPath}${KeyFile}\r
  `;
  fs.appendFileSync(filePath, config);
  console.log('New profile added to config file');
  console.log('Profile: ', config);
  return true;
}

// Checks if a profile exists in the config file
export function PofileExists(profileName: string): boolean {
  try {
    const test = new common.ConfigFileAuthenticationDetailsProvider(
      filePath,
      profileName
    );
    return true;
  } catch (err) {
    return false;
  }
}

export async function GenerateKeys(): Promise<{
  publicKey: string;
  privateKey: string;
  fingerprint: string;
}> {
  // generate key and fingerprint
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      'rsa',
      {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs1',
          format: 'pem',
        },
      },
      (err: any, publicKey: string, privateKey: string) => {
        if (err) throw reject(err);
        const keyObject = createPublicKey(publicKey);
        const publicKeyDER = keyObject.export({
          type: 'spki',
          format: 'der',
        });
        const fingerprint: string = crypto
          .createHash('md5')
          .update(publicKeyDER)
          .digest('hex')
          .replace(/..\B/g, '$&:');

        return resolve({ publicKey, privateKey, fingerprint });
      }
    );
  });
}

export async function DecryptWrappedKey(
  privateKey: string,
  encryptedKey: string
): Promise<string> {
  // Decode the encoded wrapped data and convert it to hexadecimal format.
  const buf = Buffer.from(encryptedKey, 'base64');
  const bufString = buf.toString('hex');

  // Extract the wrapped temporary AES key. (The length of this first portion of the wrapped data is equal to the
  // length of the private RSA wrapping key.) -512 Bytes/1024 characters
  const wrappedAESKey = bufString.substring(0, 1024);

  // Extract the wrapped target key. (This second portion of the wrapped data is the software-protected master encryption key.)  /
  const wrappedTargetKey = bufString.substring(1024);

  // Decrypt the wrapped temporary AES key using the private RSA wrapping key.
  const decryptedAESKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(wrappedAESKey, 'hex')
  );

  // Decrypt the wrapped target key using the temporary AES key.
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    decryptedAESKey,
    Buffer.alloc(16, 0)
  );
  const decryptedTargetKey = decipher.update(
    Buffer.from(wrappedTargetKey, 'hex')
  );
  const targetKeyStrig = decryptedTargetKey.toString('hex');
  return targetKeyStrig;
}
