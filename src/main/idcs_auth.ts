const ClientID = 'f83387194eb14b238d024b3b1f82388b';
const ClientTenant = '573e8b608b474d48b6630b0b85b0e899';

const RedirectUri = 'http://localhost:3000/callback';

export default class IdcsAuth {
  ClientID: string;

  ClientTenant: string;

  RedirectUri: string;

  Auth_Token: string;

  Access_Token: string;

  constructor() {
    this.ClientID = ClientID;
    this.ClientTenant = ClientTenant;
    this.RedirectUri = RedirectUri;
    this.Auth_Token = '';
    this.Access_Token = '';
  }

  getAuthURL() {
    return `https://idcs-${this.ClientTenant}.identity.oraclecloud.com/oauth2/v1/authorize?client_id=${this.ClientID}&response_type=code&redirect_uri=${this.RedirectUri}&scope=openid&nonce=1234&state=1234`;
  }

  getAccessURL() {
    return `https://idcs-${this.ClientTenant}.identity.oraclecloud.com/oauth2/v1/token?grant_type=authorization_code&code=${this.Auth_Token}&redirect_uri=${this.RedirectUri}&client_id=${this.ClientID}`;
  }

  getAccessToken() {
    return this.Access_Token;
  }

  setAuthToken(token: string) {
    this.Auth_Token = token;
  }

  setAccessToken(token: string) {
    this.Access_Token = token;
  }

  async accessTokenRequest() {
    // Making request to IDCS to exchange auth code for access token
    return fetch(
      `https://idcs-${this.ClientTenant}.identity.oraclecloud.com/oauth2/v1/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: `grant_type=authorization_code&code=${this.Auth_Token}&redirect_uri=${this.RedirectUri}&client_id=${this.ClientID}`,
      }
    )
      .then((res) => res.json())
      .then((body) => {
        return body;
      });
  }
}
