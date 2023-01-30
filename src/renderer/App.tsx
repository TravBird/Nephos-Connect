import {
  MemoryRouter as Router,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Transition } from 'react-transition-group';
import { act } from 'react-test-renderer';
import icon from '../../assets/icon.svg';
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

function LoginRegisterChoice() {
  const [activeState, setActiveState] = useState('Home');
  const authenticated = localStorage.getItem('authenticated');
  const navigate = useNavigate();

  const Authenticated = () => {
    if (authenticated === 'true') {
      return navigate('/home');
    }
  };
  useEffect(() => {
    Authenticated();
  });
  return (
    <>
      <div className="LoginRegisterContainer">
        <Home
          isActive={activeState === 'Home'}
          onLoginChoice={() => setActiveState('Login')}
          onRegisterChoice={() => setActiveState('Register')}
        />
        <Login
          isActive={activeState === 'Login'}
          onBack={() => setActiveState('Home')}
        />
        <Register
          isActive={activeState === 'Register'}
          onBack={() => setActiveState('Home')}
        />
      </div>
    </>
  );
}

function Home({ isActive, onLoginChoice, onRegisterChoice }) {
  return (
    <div className="Home">
      {isActive ? (
        <div className="buttons">
          <button
            type="button"
            onClick={() => onLoginChoice({ activeState: 'Login' })}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => onRegisterChoice({ activeState: 'Register' })}
          >
            Register
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Login({ isActive, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginFailed, setLoginFailed] = useState(false);
  const [authenticated, setauthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );
  const navigate = useNavigate();
  return (
    <Transition in={isActive} timeout={1000}>
      {(state) => (
        <div
          style={{
            ...defaultStyle,
            ...transitionStyles[state],
          }}
        >
          <div>
            {isActive ? (
              <div className="FormContainer">
                <h1>Login</h1>
                <input
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                />
                <input
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => {
                    window.electron.ipcRenderer
                      .login('login', username, password)
                      .then((result) => {
                        if (result.success === 'true') {
                          localStorage.setItem('authenticated', 'true');
                          setauthenticated('true');
                          navigate('/home');
                        }
                        setLoginFailed(true);
                      });
                  }}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginFailed(false);
                    onBack({ activeState: 'Home' });
                  }}
                >
                  Back
                </button>
                <div className="detail_fail">
                  {loginFailed ? <h1>Login Failed, please try again</h1> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Transition>
  );
}

function Register({ isActive, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerFailed, setRegisterFailed] = useState(false);
  const [authenticated, setauthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );
  const navigate = useNavigate();
  return (
    <Transition in={isActive} timeout={1000}>
      {(state) => (
        <div
          style={{
            ...defaultStyle,
            ...transitionStyles[state],
          }}
        >
          <div>
            {isActive ? (
              <div className="FormContainer">
                <h1>Register</h1>
                <input
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                />
                <input
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => {
                    window.electron.ipcRenderer
                      .register('register', username, password)
                      .then((result) => {
                        if (result.success === 'true') {
                          localStorage.setItem('authenticated', 'true');
                          setauthenticated('true');
                          navigate('/home');
                        }
                        setRegisterFailed(true);
                      });
                  }}
                >
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRegisterFailed(false);
                    onBack({ activeState: 'Home' });
                  }}
                >
                  Back
                </button>
                <div className="detail_fail">
                  {registerFailed ? (
                    <h1>Registration Failed, please try again</h1>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Transition>
  );
}

function MainMenu() {
  const [authenticated, setauthenticated] = useState(
    localStorage.getItem(localStorage.getItem('authenticated') || 'false')
  );
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem('authenticated');
    setauthenticated('false');
    navigate('/');
  };
  return (
    <div>
      <h1>Home</h1>
      <div id="OS Selection">
        <h1>Select your operating system below</h1>
        <ul>
          <li>Windows</li>
          <li>Linux Debian</li>
          <li>Linux Ubuntu</li>
        </ul>
      </div>
      <button type="button" onClick={() => logout()}>
        Logout
      </button>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginRegisterChoice />} />
        <Route path="/home" element={<MainMenu />} />
      </Routes>
    </Router>
  );
}
