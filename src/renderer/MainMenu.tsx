/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-filename-extension */
import { MemoryRouter as Router, useNavigate } from 'react-router-dom';
import { SetStateAction, useEffect, useState } from 'react';
import './App.css';

function ErrorPopup({ message, setError }: any) {
  return (
    <div id="ErrorPopup">
      <div className="ErrorPopupContent">
        <span
          className="CloseErrorPopup"
          onClick={() => {
            setError('');
          }}
        >
          &times;
        </span>
        <h2>An error has occured!</h2>
        <h3>{message}</h3>
        {message.includes(
          'required information to complete authentication was not provided or was incorrect'
        ) ? (
          <h3>
            Please login again. If the problem persists, please contact a Nephos
            Admin
          </h3>
        ) : null}
      </div>
    </div>
  );
}

function OpenSystemCreateButton({ setOpenNewSystemSelection }) {
  return (
    <button
      type="button"
      id="OpenSystemCreateButton"
      onClick={() => {
        setOpenNewSystemSelection(true);
      }}
    >
      Create New System
    </button>
  );
}

function ListNewSystem({
  config,
  selectedNewSystem,
  setSelectedNewSystem,
}: any) {
  const [open, setOpen] = useState(false);
  console.log(config);
  console.log(selectedNewSystem);
  const { id, displayName } = config;
  return (
    <li className="ConfigInfo" key={config.id}>
      <div className="InitialInfo">
        <span id={config.id}>
          <input
            type="radio"
            checked={selectedNewSystem.id === config.id}
            onChange={() => setSelectedNewSystem({ id, displayName })}
          />
          {displayName}
        </span>
        <span>
          <button
            type="button"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? '- Less Info' : '+ Advanced Info'}
          </button>
        </span>
      </div>
      {open ? (
        <div className="AdditionalInfo">
          <h4>System Specs:</h4>
          <ul>
            <li>Memory: GB</li>
            <li>Storage: GB</li>
            <li>OCPUS: </li>
            <li>GPU: </li>
          </ul>
        </div>
      ) : null}
    </li>
  );
}

async function getSystemConfigs(setError) {
  const result = await window.electron.ipcRendererOCI.listSystemConfigurations(
    'list-system-configs'
  );
  console.log(result);
  if (result.success === 'true') {
    console.log('Successfully retrieved system configs');
    return result.configs;
  }
  console.log('Error retrieving system configs');
  setError(result.error.message);
  return [];
}

function NewSystemSelection({
  selectedNewSystem,
  setSelectedNewSystem,
  setError,
  openNewSystemSelection,
}: any) {
  const [configs, setConfigs] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // You can await here
      setConfigs(await getSystemConfigs(setError));
    }
    fetchData();
  }, [openNewSystemSelection]);
  return (
    <div id="Create System Select">
      <ul>
        {configs.map((config) => (
          <ListNewSystem
            config={config}
            selectedNewSystem={selectedNewSystem}
            setSelectedNewSystem={setSelectedNewSystem}
          />
        ))}
      </ul>
    </div>
  );
}

// needs improving
async function createSystemRequest(
  instanceConfigurationId: string,
  displayName: string,
  setError: any
) {
  const result = await window.electron.ipcRendererOCI.createSystem(
    'create-system',
    instanceConfigurationId,
    displayName
  );
  console.log(result);
  if (result.success === 'true') {
    console.log('Successfully created system');
    return result;
  }
  console.log('Failed to create system: ', result.message);
  setError(result.message);

  return result;
}

function CreateSystemButton({ selectedNewSystem, setError }: any) {
  console.log('creating system with id and display name: ');
  const { id, displayName } = selectedNewSystem;
  return (
    <button
      type="button"
      onClick={() => createSystemRequest(id, displayName, setError)}
      // id={selected}
      // disabled={awaiting}
    >
      Create Selected new System?
    </button>
  );
}

function CreateSystemForm({
  selectedNewSystem,
  setSelectedNewSystem,
  setError,
  setOpenNewSystemSelection,
}: any) {
  return (
    <div id="CreateSystemForm">
      <div className="CreateSystemFormContent">
        <span
          className="CloseCreateSystemForm"
          onClick={() => {
            setOpenNewSystemSelection(false);
          }}
        >
          &times;
        </span>
        <h2>Create a new System</h2>
        <NewSystemSelection
          selectedNewSystem={selectedNewSystem}
          setSelectedNewSystem={setSelectedNewSystem}
          setError={setError}
        />
        {selectedNewSystem.id !== '' ? (
          <CreateSystemButton
            selectedNewSystem={selectedNewSystem}
            setError={setError}
          />
        ) : null}
      </div>
    </div>
  );
}

async function getUserSystems(setError) {
  const result = await window.electron.ipcRendererOCI.listUserSystems(
    'list-user-systems'
  );
  console.log(result);
  if (result.success === 'true') {
    console.log('Successfully retrieved user systems');
    return result.systems;
  }
  console.log('Error retrieving user systems');
  setError(result.error.message);
  return [];
}

function ListSystem({ system, selected, setSelected }: any) {
  const [open, setOpen] = useState(false);

  return (
    <li className="ConfigInfo" key={system.id}>
      <div className="InitialInfo">
        <span id={system.displayName}>
          <input
            type="radio"
            checked={selected === system.displayName}
            onChange={() => setSelected(system)}
          />
          {system.displayName}
        </span>
        <span>
          <button
            type="button"
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? '- Less Info' : '+ Advanced Info'}
          </button>
        </span>
      </div>
      {open ? (
        <div className="AdditionalInfo">
          <h4>System Specs:</h4>
          <ul>
            <li>Memory: {system.shapeConfig.memoryInGBs} GB</li>
            <li>Storage: {system.shapeConfig.storageInGBs} GB</li>
            <li>OCPUS: {system.shapeConfig.ocpus}</li>
            <li>GPU: {system.shapeConfig.gpus}</li>
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function SysSelection({ systems, selected, setSelected }: any) {
  return (
    <div id="User System Selection">
      <h1>Select your System below</h1>
      <ul>
        {systems.map((system) => (
          <ListSystem
            system={system}
            selected={selected}
            setSelected={setSelected}
          />
        ))}
      </ul>
    </div>
  );
}

// needs to be looked at
const startSystemRequest = (
  request: string,
  setError: any,
  setAwaiting: any
) => {
  setAwaiting(true);
  startVM(request)
    .then((result) => {
      setAwaiting(false);
      if (result === 'success') {
        return true;
      }
      setError(true);
      setError(result);
      return false;
    })
    .catch((error) => {
      setAwaiting(false);
      setError(true);
    });
};

function StartSystemButton({ selected, awaiting, setAwaiting, setError }: any) {
  return (
    <button
      type="button"
      onClick={() => startSystemRequest(selected, setError, setAwaiting)}
      id={selected}
      disabled={awaiting}
    >
      Start {selected}?
    </button>
  );
}

function LogoutButton(setError: SetStateAction<any>) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      id="LogoutButton"
      onClick={() => {
        // localStorage.removeItem('authenticated');
        // setAuthenticated('false');
        window.electron.ipcRendererOCIauth
          .logout('logout')
          .then((result) => {
            console.log(result);
            if (result.success === 'true') {
              localStorage.removeItem('authenticated');
              return navigate('/');
            }
            console.log('Logout failed');
            setError(result.error.message);
            return null;
          })
          .catch((err) => console.log(err));
      }}
    >
      Logout
    </button>
  );
}

export default function MainMenu() {
  const [systems, setSystems] = useState([{}]);
  const [selected, setSelected] = useState('');
  const [selectedNewSystem, setSelectedNewSystem] = useState({
    id: '',
    displayName: '',
  });
  const [awaiting, setAwaiting] = useState(false);
  const [error, setError] = useState('');

  const [openNewSystemSelection, setOpenNewSystemSelection] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // You can await here
      const response = await getUserSystems(setError);
      setSystems(response);
    }
    fetchData();
  }, []);

  if (systems.length > 0) {
    return (
      <div>
        {error !== '' ? (
          <ErrorPopup message={error} setError={setError} />
        ) : null}
        <SysSelection
          systems={systems}
          selected={selected}
          setSelected={setSelected}
          setError={setError}
        />
        {selected !== '' ? (
          <StartSystemButton
            selected={selected}
            awaiting={awaiting}
            setAwaiting={setAwaiting}
            setError={setError}
          />
        ) : null}
        <OpenSystemCreateButton
          setOpenNewSystemSelection={setOpenNewSystemSelection}
        />
        {openNewSystemSelection ? (
          <CreateSystemForm
            selectedNewSystem={selectedNewSystem}
            setSelectedNewSystem={setSelectedNewSystem}
            setError={setError}
            setOpenNewSystemSelection={setOpenNewSystemSelection}
          />
        ) : null}
        <LogoutButton setError={setError} />
      </div>
    );
  }
  return (
    <div>
      <h2>You have no systems yet, create a new one here!</h2>
      {error !== '' ? <ErrorPopup message={error} setError={setError} /> : null}
      {openNewSystemSelection ? (
        <CreateSystemForm
          selectedNewSystem={selectedNewSystem}
          setSelectedNewSystem={setSelectedNewSystem}
          setError={setError}
          setOpenNewSystemSelection={setOpenNewSystemSelection}
        />
      ) : null}
      <OpenSystemCreateButton
        setOpenNewSystemSelection={setOpenNewSystemSelection}
      />
      <LogoutButton setError={setError} />
    </div>
  );
}
