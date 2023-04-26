// OCI SDK
import * as common from 'oci-common';
import * as core from 'oci-core';
import * as identity from 'oci-identity';
import * as keyManagement from 'oci-keymanagement';
import * as responses from 'oci-core/lib/response';
import * as fs from 'fs';
import os from 'os';
import { createPublicKey } from 'crypto';

const crypto = require('crypto');

const filePath = `${os.homedir()}/.oci/config`;
const keyPath = `${os.homedir()}/.oci/keys/`;

export class OCIConnect {
  computeClient: core.ComputeClient;

  clientManagement: core.ComputeManagementClient;

  identityClient: identity.IdentityClient;

  keyClient: keyManagement.KmsManagementClient;

  keyCryptoClient: keyManagement.KmsCryptoClient;

  profileName: string;

  filePath: string;

  OCID: string;

  userCompartment: string;

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

    this.keyClient.endpoint = 'https://kms.uk-london-1.oraclecloud.com';

    this.keyCryptoClient.endpoint = 'https://kms.uk-london-1.oraclecloud.com';
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

  // Instance functions
  async listUserInstances(): Promise<core.models.Instance[]> {
    try {
      // creating request object
      const request: core.requests.ListInstancesRequest = {
        compartmentId: this.userCompartment,
      };
      // sending request to client
      const response = await this.computeClient.listInstances(request);
      console.log(
        'Response recieved from list instances: ',
        response,
        '. Response Ended.'
      );
      return response.items;
    } catch (e) {
      console.log('Error in listUserInstances ', e);
      throw e;
    }
  }

  async startInstance(
    instanceId: string
  ): Promise<responses.InstanceActionResponse> {
    try {
      const request: core.requests.InstanceActionRequest = {
        instanceId,
        action: core.requests.InstanceActionRequest.Action.Start,
      };

      const response = await this.computeClient.instanceAction(request);

      console.log(
        'Response recieved from start instance: ',
        response,
        '. Response Ended.'
      );

      return response;
    } catch (e) {
      console.log('Error in startInstance ', e);
      throw e;
    }
  }

  async stopInstance(
    instanceId: string
  ): Promise<responses.InstanceActionResponse> {
    try {
      const request: core.requests.InstanceActionRequest = {
        instanceId,
        action: core.requests.InstanceActionRequest.Action.Softstop,
      };

      const response = await this.computeClient.instanceAction(request);

      console.log(
        'Response recieved from stop instance: ',
        response,
        '. Response Ended.'
      );

      return response;
    } catch (e) {
      console.log('Error in stopInstance ', e);
      throw e;
    }
  }

  // Teriminate instance
  async terminateInstance(
    instanceId: string
  ): Promise<responses.TerminateInstanceResponse> {
    try {
      const request: core.requests.TerminateInstanceRequest = {
        instanceId,
      };

      const response = await this.computeClient.terminateInstance(request);

      console.log(
        'Response recieved from terminate instance: ',
        response,
        '. Response Ended.'
      );

      return response;
    } catch (e) {
      console.log('Error in terminateInstance ', e);
      throw e;
    }
  }

  // Oracle Vault functions
  async createSSHKey(
    compartmentId: string,
    displayName: string,
    keyShape: keyManagement.models.KeyShape
  ): Promise<keyManagement.models.CreateKeyDetails> {
    try {
      const request: keyManagement.requests.CreateKeyRequest = {
        createKeyDetails: {
          compartmentId,
          displayName,
          keyShape,
        },
      };

      const response = await this.keyClient.createKey(request);

      console.log(
        'Response recieved from create key: ',
        response,
        '. Response Ended.'
      );
      return response;
    } catch (e) {
      console.log('Error in createSSHKey ', e);
      throw e;
    }
  }

  async importSSHKey(
    compartmentId: string,
    displayName: string,
    keyShape: keyManagement.models.KeyShape,
    wrappedImportKey: keyManagement.models.WrappedImportKey
  ): Promise<keyManagement.models.ImportKeyDetails> {
    try {
      const request: keyManagement.requests.ImportKeyRequest = {
        importKeyDetails: {
          compartmentId,
          displayName,
          keyShape,
          wrappedImportKey,
        },
      };
      const response = await this.keyClient.importKey(request);
      console.log(
        'Response recieved from import key: ',
        response,
        '. Response Ended.'
      );
      return response;
    } catch (e) {
      console.log('Error in importSSHKey ', e);
      throw e;
    }
  }

  async listSSHKeys(): Promise<keyManagement.models.KeySummary[]> {
    try {
      const request: keyManagement.requests.ListKeysRequest = {
        compartmentId:
          'ocid1.vault.oc1.uk-london-1.d5seppcnaaggq.abwgiljsjjkkpibzs3gv4rqr2nsykyqwk4gubtrunqnaqihvcr2srgtzxqva',
      };

      const response = await this.keyClient.listKeys(request);

      console.log(
        'Response recieved from list keys: ',
        response,
        '. Response Ended.'
      );
      return response.items;
    } catch (e) {
      console.log('Error in listSSHKeys ', e);
      throw e;
    }
  }

  async getSSHKey(keyId: string): Promise<keyManagement.models.Key> {
    try {
      const request: keyManagement.requests.GetKeyRequest = {
        keyId,
      };

      const response = await this.keyClient.getKey(request);
      console.log(
        'Response recieved from get key: ',
        response,
        '. Response Ended.'
      );
      return response.key;
    } catch (e) {
      console.log('Error in getSSHKey ', e);
      throw e;
    }
  }

  async exportSSHKey(
    keyId: string,
    algorithm: keyManagement.models.ExportKeyDetails.Algorithm,
    publicKey: string
  ): Promise<keyManagement.models.ExportedKeyData> {
    try {
      const request: keyManagement.requests.ExportKeyRequest = {
        exportKeyDetails: {
          keyId,
          algorithm,
          publicKey,
        },
      };

      const response = await this.keyCryptoClient.exportKey(request);
      console.log(
        'Response recieved from export key: ',
        response,
        '. Response Ended.'
      );
      return response.exportedKeyData;
    } catch (e) {
      console.log('Error in exportSSHKey ', e);
      throw e;
    }
  }

  // Instance configuration functions
  // getting list of all instance configs
  async listInstanceConfigurations(): Promise<
    core.models.InstanceConfigurationSummary[]
  > {
    try {
      // creating request object
      const request: core.requests.ListInstanceConfigurationsRequest = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaamowsqxoe4apfqwhqdxp6s4b4222s5eqqpt3a4fegjorekzkw3wta',
      };
      // sending request to client
      const response = await this.clientManagement.listInstanceConfigurations(
        request
      );
      console.log(
        'Response recieved from get instance configuration: ',
        response,
        '. Response Ended.'
      );
      return response.items;
    } catch (e) {
      console.log('Error in getInstanceConfiguration ', e);
      throw e;
    }
  }

  async getInstanceConfig(selectedConfig) {
    try {
      // Create a request and dependent object(s).
      const getInstanceConfigurationRequest: core.requests.GetInstanceConfigurationRequest =
        {
          instanceConfigurationId: selectedConfig,
        };

      // Send request to the Client.
      const getInstanceConfigurationResponse =
        await this.clientManagement.getInstanceConfiguration(
          getInstanceConfigurationRequest
        );
      return getInstanceConfigurationResponse;
    } catch (error) {
      console.log(`getInstanceConfiguration Failed with error  ${error}`);
      throw error;
    }
  }

  async launchInstanceFromConfig(details): Promise<core.models.Instance> {
    try {
      // log the details
      console.log(details);
      const instanceDetails = await this.getInstanceConfig(details.config.id);

      console.log(instanceDetails);
      const request: core.requests.LaunchInstanceConfigurationRequest = {
        instanceConfigurationId: details.config.id,
        instanceConfiguration: instanceDetails,
      };

      const response = await this.clientManagement.launchInstanceConfiguration(
        request
      );

      return response;
    } catch (error) {
      console.log('Error in launchInstanceFromConfig ', error);
      throw error;
    }
  }

  // User management functions
  async addApiKeyToUser(key: string, user: string) {
    try {
      const apiKey: identity.models.CreateApiKeyDetails = {
        key,
      };
      const request: identity.requests.UploadApiKeyRequest = {
        createApiKeyDetails: apiKey,
        userId: user,
      };
      const response = await this.identityClient.uploadApiKey(request);

      return response;
    } catch (error) {
      console.log('Error in addApiKeyToUser ', error);
      throw error;
    }
  }

  async getUserOCID(user: string) {
    try {
      const request: identity.requests.ListUsersRequest = {
        compartmentId:
          'ocid1.tenancy.oc1..aaaaaaaax25zqrammapt7upslefqq3kv6dzilt6z55yobnf2cmrn3tcimgpa',
        identityProviderId:
          'ocid1.saml2idp.oc1..aaaaaaaace5zv3qqzb6ycrvbvmto4uhjyfmsrqkveiq4pa5rvh7jcjg7fpzq',
      };
      const response = await this.identityClient.listUsers(request);
      for (let i = 0; i < response.items.length; i++) {
        if (response.items[i].description === user) {
          this.OCID = response.items[i].id;
          return response.items[i].id;
        }
      }
      throw new Error('User not found');
    } catch (error) {
      console.log('Error in getUser ', error);
      throw error;
    }
  }

  // Compartment management functions
  // Check if compartment exists
  async findUserCompartment(profileName) {
    try {
      const compartmentName = profileName;
      const request: identity.requests.ListCompartmentsRequest = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
        name: compartmentName,
      };
      const response = await this.identityClient.listCompartments(request);
      if (response.items.length === 0) {
        return undefined;
      }
      return response.items[0];
    } catch (error) {
      console.log('Error in compartmentExists ', error);
      throw error;
    }
  }

  // Create a new compartment
  async createCompartment(profileName) {
    try {
      const compartmentName = profileName;
      const compartment: identity.models.CreateCompartmentDetails = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
        name: compartmentName,
        description: `Nephos generated compartment for ${compartmentName}`,
      };
      const request: identity.requests.CreateCompartmentRequest = {
        createCompartmentDetails: compartment,
      };
      const response = await this.identityClient.createCompartment(request);
      return response;
    } catch (error) {
      console.log('Error in createCompartment ', error);
      throw error;
    }
  }

  // Group management functions
  // Check if group exists
  async groupExists() {
    try {
      const groupName = this.profileName;
      const request: identity.requests.ListGroupsRequest = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
        name: groupName,
      };
      const response = await this.identityClient.listGroups(request);
      if (response.items.length > 0) {
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error in groupExists ', error);
      throw error;
    }
  }

  // Create a new group
  async createGroup() {
    try {
      const groupName = this.profileName;
      const group: identity.models.CreateGroupDetails = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
        name: groupName,
        description: `Nephos generated group for ${groupName}`,
      };
      const request: identity.requests.CreateGroupRequest = {
        createGroupDetails: group,
      };
      const response = await this.identityClient.createGroup(request);
      return response;
    } catch (error) {
      console.log('Error in createGroup ', error);
      throw error;
    }
  }

  // Policy management functions
  // Check if policy exists
  async policyExists() {
    try {
      const policyName = this.profileName;
      const request: identity.requests.ListPoliciesRequest = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
        name: policyName,
      };
      const response = await this.identityClient.listPolicies(request);
      if (response.items.length > 0) {
        return true;
      }
      return false;
    } catch (error) {
      console.log('Error in policyExists ', error);
      throw error;
    }
  }

  // Create a new policy
  async createPolicy() {
    try {
      const policyName = this.profileName;
      const policy: identity.models.CreatePolicyDetails = {
        compartmentId:
          'ocid1.compartment.oc1..aaaaaaaaeopg7o4tp3wo5lyv3o3i5vsi5zwndt5bip2uwrvbvzegnhvvvb2q',
        name: policyName,
        description: `Nephos generated policy for ${policyName}`,
        statements: [
          {
            actions: ['*'],
            resources: ['*'],
          },
        ],
      };
      const request: identity.requests.CreatePolicyRequest = {
        createPolicyDetails: policy,
      };
      const response = await this.identityClient.createPolicy(request);
      return response;
    } catch (error) {
      console.log('Error in createPolicy ', error);
      throw error;
    }
  }
}

// Creates a new local profile in the config file
export function CreateProfile(
  email: string,
  user: string,
  fingerprint: string,
  tenancy: string,
  region: string,
  KeyFile: string
) {
  const config = `\r\n[${email}]
  user=${user}\r
  fingerprint=${fingerprint}\r
  tenancy=${tenancy}\r
  region=${region}\r
  key_file=${keyPath}${KeyFile}\r
  `;

  try {
    fs.appendFileSync(filePath, config);
    console.log('New profile added to config file');
    return true;
  } catch (e) {
    console.log('Error in CreateProfile: ', e);
    throw e;
  }
}

// Checks if a profile exists in the config file
export function PofileExists(profileName: string) {
  try {
    const provider = new common.ConfigFileAuthenticationDetailsProvider(
      filePath,
      profileName
    );
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function GenerateKeys() {
  // generate key and fingerprint
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      'rsa',
      {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      },
      (err: any, publicKey: any, privateKey: any) => {
        if (err) throw reject(err);
        const keyObject = createPublicKey(publicKey);
        const publicKeyDER = keyObject.export({
          type: 'spki',
          format: 'der',
        });
        const fingerprint = crypto
          .createHash('md5')
          .update(publicKeyDER)
          .digest('hex')
          .replace(/..\B/g, '$&:');

        resolve({ publicKey, privateKey, fingerprint });
      }
    );
  });
}
