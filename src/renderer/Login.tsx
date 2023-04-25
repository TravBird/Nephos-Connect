/* eslint-disable react/jsx-filename-extension */
import { MemoryRouter as Router, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Transition } from 'react-transition-group';
import './App.css';

const defaultStyle = {
  transition: `opacity ${400}ms ease-in-out`,
  opacity: 0,
};

const transitionStyles = {
  entering: { opacity: 1 },
  entered: { opacity: 1 },
  exiting: { opacity: 0 },
  exited: { opacity: 0 },
};

async function checkInternet() {
  console.log(navigator.onLine);
  if (!navigator.onLine) {
  }
}

async function loginRequest(
  onLoading,
  onLoadingFirstTime,
  onLoadingLocalSetup,
  onLoadingError,
  navigate,
  setInternet
) {
  if (!navigator.onLine) {
    setInternet(false);
    return;
  }
  onLoading();
  console.log('Making oci-login-sso request');
  const ociLoginResult = await window.electron.ipcRendererOCIauth.login_sso(
    'oci-login-sso'
  );
  console.log(ociLoginResult);
  if (
    ociLoginResult.success === 'true' &&
    ociLoginResult.setupRequired === 'false'
  ) {
    // no setup required
    console.log('No setup required');
    localStorage.setItem('authenticated', 'true');
    return navigate('/home');
  }
  if (
    ociLoginResult.success === 'true' &&
    ociLoginResult.setupRequired === 'true'
  ) {
    if (ociLoginResult.message === 'local') {
      onLoadingLocalSetup();
      console.log('Making setup-local request');
      const ociLocalSetupResult =
        await window.electron.ipcRendererSetup.setupLocal('setup-local');
      console.log(ociLocalSetupResult);
      if (
        ociLocalSetupResult.success === 'true' &&
        ociLocalSetupResult.setupRequired === 'true'
      ) {
        // additional setup required
        onLoadingFirstTime();
        console.log('Making setup-account request');
        const ociFirstTimeSetupResult =
          await window.electron.ipcRendererSetup.setupAccount('setup-account');
        console.log(ociFirstTimeSetupResult);
        if (ociFirstTimeSetupResult.success === 'true') {
          console.log('Local and account setup complete!');
          localStorage.setItem('authenticated', 'true');
          return navigate('/home');
        }
        console.log('Account setup failed');
        onLoadingError(ociFirstTimeSetupResult.message);
        if (ociLocalSetupResult.success === 'true') {
          // no additional setup required
          console.log('Local setup complete!');
          localStorage.setItem('authenticated', 'true');
          return navigate('/home');
        }
        console.log('Local setup failed');
        onLoadingError(ociLocalSetupResult.message);
        return navigate('/');
      }
      if (
        ociLocalSetupResult.success === 'true' &&
        ociLocalSetupResult.setupRequired === 'false'
      ) {
        console.log('Local setup complete, and no additional setup required!');
        localStorage.setItem('authenticated', 'true');
        return navigate('/home');
      }
      console.log('Local setup failed');
      onLoadingError(ociLocalSetupResult.message);
    }
    if (ociLoginResult.message === 'account') {
      onLoadingFirstTime();
      console.log('Making setup-account request');
      const ociFirstTimeSetupResult =
        await window.electron.ipcRendererSetup.setupAccount('setup-account');
      console.log(ociFirstTimeSetupResult);
      if (ociFirstTimeSetupResult.success === 'true') {
        console.log('Account setup complete!');
        localStorage.setItem('authenticated', 'true');
        return navigate('/home');
      }
      console.log('Account setup failed');
      onLoadingError(ociFirstTimeSetupResult.message);
    } else {
      onLoadingError(ociLoginResult.message);
    }
  }
  onLoadingError('Unknown error');
}

export function Home({
  isActive,
  onLoading,
  onLoadingFirstTime,
  onLoadingLocalSetup,
  onLoadingError,
  internet,
  setInternet,
}) {
  const navigate = useNavigate();
  const [authenticated, setauthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );

  useEffect(() => {
    if (!navigator.onLine) {
      console.log('No internet connection');
      setInternet(false);
      const buttons = document.getElementsByClassName('LoginButton');
      for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
      }
    }
    setInternet(true);
    const buttons = document.getElementsByClassName('LoginButton');
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].disabled = false;
    }
  }, [setInternet]);
  return (
    <div className="Home">
      {isActive ? (
        <>
          <div className="LoginRegister">
            <button
              className="LoginButton"
              type="button"
              onClick={() =>
                loginRequest(
                  onLoading,
                  onLoadingFirstTime,
                  onLoadingLocalSetup,
                  onLoadingError,
                  navigate,
                  setInternet
                )
              }
            >
              Login
            </button>
            <button
              className="LoginButton"
              type="button"
              onClick={() => {
                if (!navigator.onLine) {
                  setInternet(false);
                  return;
                }
                window.electron.ipcRendererOCIauth
                  .register_sso('oci-register-sso')
                  .then((result) => {
                    if (result.success === 'true') {
                      return navigate('/');
                    }
                    return null;
                  })
                  .catch((err) => {
                    console.log(err);
                  });
              }}
            >
              Register
            </button>
            <br />
          </div>
          {!internet ? (
            <div id="internetStatus">
              {' '}
              <h4 style={{ color: 'red' }}> No Internet Detected!</h4> Nephos
              cannot operate without a connection, please connect the device via
              Ethernet or use the WiFi options button in the top right{' '}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function Loading({ isActive, message }) {
  if (message !== '') {
    return (
      <div>
        {isActive ? (
          <>
            <h1>{message}</h1>
            <div className="Loader" />
          </>
        ) : null}
      </div>
    );
  }
  if (message === '' && message.includes('error')) {
    return (
      <div>
        {isActive ? (
          <>
            <h2 style={{ color: 'red' }}>{message}</h2>
            <div className="Loader" />
          </>
        ) : null}
      </div>
    );
  }
  return (
    <div>
      {isActive ? (
        <>
          <h1>Logging you in... Please Wait</h1>
          <div className="Loader" />
        </>
      ) : null}
    </div>
  );
}
