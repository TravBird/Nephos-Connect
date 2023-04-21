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

export function Home({ isActive }) {
  const navigate = useNavigate();
  const [authenticated, setauthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );
  return (
    <div className="Home">
      {isActive ? (
        <div className="LoginRegister">
          <button
            className="LoginButton"
            type="button"
            onClick={() => {
              window.electron.ipcRendererOCIauth
                .login_sso('oci-login-sso')
                .then((result) => {
                  if (result.success === 'true') {
                    // localStorage.setItem('authenticated', 'true');
                    setauthenticated('true');
                    navigate('/home');
                  }
                  // setLoginFailed(true);
                })
                .catch((err) => {
                  console.log(err);
                });
            }}
          >
            Login
          </button>
          <button
            className="LoginButton"
            type="button"
            onClick={() => {
              window.electron.ipcRendererOCIauth
                .register_sso('oci-register-sso')
                .then((result) => {
                  if (result.success === 'true') {
                    // localStorage.setItem('authenticated', 'true');
                    setauthenticated('true');
                    navigate('/');
                  }
                })
                .catch((err) => {
                  console.log(err);
                });
            }}
          >
            Register
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function Loading({ isActive }) {
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
