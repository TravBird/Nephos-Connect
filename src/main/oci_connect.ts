// OCI SDK
import common = require('oci-common');
import * as core from 'oci-core';
import * as identity from 'oci-identity';
import * as wr from 'oci-workrequests';

// Config File may need to be specified in future, especially when running on NephOS Natively
const provider: common.ConfigFileAuthenticationDetailsProvider =
  new common.ConfigFileAuthenticationDetailsProvider();

// Loading config Values
const tenancyId = provider.getTenantId();
const fingerprint = provider.getFingerprint();
const region = provider.getRegion();

// Create a new ComputeClient
const computeClient = new core.ComputeClient({
  authenticationDetailsProvider: provider,
});

const clientManagement = new core.ComputeManagementClient({
  authenticationDetailsProvider: provider,
});

const identityClient = new identity.IdentityClient({
  authenticationDetailsProvider: provider,
});

async function getAvailabilityDomain(): Promise<identity.models.AvailabilityDomain> {
  const request: identity.requests.ListAvailabilityDomainsRequest = {
    compartmentId: tenancyId,
  };

  const response = await identityClient.listAvailabilityDomains(request);
  return response.items[0];
}

const availabilityDomain = getAvailabilityDomain();

// function to get availible shapes
export async function getShape(
  availabilityDomain = availabilityDomain
): Promise<core.models.Shape> {
  const request: core.requests.ListShapesRequest = {
    availabilityDomain: availabilityDomain.name,
    compartmentId:
      'ocid1.compartment.oc1..aaaaaaaamowsqxoe4apfqwhqdxp6s4b4222s5eqqpt3a4fegjorekzkw3wta',
  };

  const response = await computeClient.listShapes(request);

  // for (const shape of response.items) {
  // if (
  //    shape.shape.startsWith('VM') &&
  //    shape.shape.toLowerCase().indexOf('flex') == -1
  //  ) {
  //    return shape;
  //  }
  // }

  return response;
}

export async function getInstanceConfiguration(): Promise<core.models.InstanceConfigurationSummary> {
  const request: core.requests.ListInstanceConfigurationsRequest = {
    compartmentId:
      'ocid1.compartment.oc1..aaaaaaaamowsqxoe4apfqwhqdxp6s4b4222s5eqqpt3a4fegjorekzkw3wta',
  };

  const response = await clientManagement.listInstanceConfigurations(request);

  // for (const shape of response.items) {
  // if (
  //    shape.shape.startsWith('VM') &&
  //    shape.shape.toLowerCase().indexOf('flex') == -1
  //  ) {
  //    return shape;
  //  }
  // }

  return response;
}

async function getInstanceConfig(selectedConfig) {
  try {
    // Create a request and dependent object(s).
    const getInstanceConfigurationRequest: core.requests.GetInstanceConfigurationRequest =
      {
        instanceConfigurationId: selectedConfig,
      };

    // Send request to the Client.
    const getInstanceConfigurationResponse =
      await clientManagement.getInstanceConfiguration(
        getInstanceConfigurationRequest
      );
    return getInstanceConfigurationResponse;
  } catch (error) {
    console.log(`getInstanceConfiguration Failed with error  ${error}`);
  }
}

export async function launchInstanceFromConfig(
  details
): Promise<core.models.Instance> {
  // log the details
  console.log(details);
  const instanceDetails = await getInstanceConfig(details.config.id);

  console.log(instanceDetails);
  const request: core.requests.LaunchInstanceConfigurationRequest = {
    instanceConfigurationId: details.config.id,
    instanceConfiguration: instanceDetails,
  };

  const response = await clientManagement.launchInstanceConfiguration(request);

  return response;
}
