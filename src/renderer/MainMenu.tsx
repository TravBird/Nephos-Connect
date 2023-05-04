/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-filename-extension */
import { MemoryRouter as Router, useNavigate } from 'react-router-dom';
import { SetStateAction, useEffect, useState } from 'react';
import './App.css';

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
  console.log('Creating system: ', instanceConfigurationId);
  console.log('Display name: ', displayName);
  // make request to create system
  const system = await window.electron.ipcRendererOCI.createSystem(
    'create-system',
    instanceConfigurationId,
    displayName
  );

  if (system.success !== 'true') {
    setError(system.error.message);
    return;
  }

  // listen for updates
  window.electron.ipcRendererOCI.listenUpdate(
    'create-system-update',
    (event, message) => {
      console.log('Hello! :D');
      console.log(message);
      if (message.status === 'success') {
        // setLoading(message.message);
        console.log(message.message);
      }
      if (message.status === 'error') {
        // setLoading(message.message);
        setError(message.error);
      }
    }
  );
}

function CreateSystemButton({
  selectedNewSystem,
  systemDisplayName,
  setError,
}: any) {
  console.log(systemDisplayName);
  let name = '';
  const { id, displayName } = selectedNewSystem;
  if (systemDisplayName === '') {
    name = displayName;
  } else {
    name = systemDisplayName;
  }
  return (
    <button
      type="button"
      onClick={() => createSystemRequest(id, name, setError)}
      // id={selected}
      // disabled={awaiting}
    >
      Create Selected new System? : {name}
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
          <>
            <h4>
              You can change the Systems name below, or leave it default. Note:
              the name must be unique!
            </h4>
            <input
              type="text"
              id="displayName"
              name="displayName"
              placeholder={selectedNewSystem.displayName}
            />
            <CreateSystemButton
              selectedNewSystem={selectedNewSystem}
              systemDisplayName={
                (document.getElementById('displayName') as HTMLInputElement)
                  .value
              }
              setError={setError}
            />
          </>
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
  const { id, displayName, lifecycleState } = system;
  console.log(selected);
  return (
    <li className="ConfigInfo" key={id}>
      <div className="InitialInfo">
        <span id={displayName}>
          <input
            type="radio"
            checked={selected.displayName === displayName}
            onChange={() => setSelected({ id, displayName, lifecycleState })}
          />
          {displayName}: {lifecycleState}
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

async function startSystemRequest(
  instanceConfigurationId,
  displayName,
  setError,
  setAwaiting
) {
  console.log('start system request: ', instanceConfigurationId, displayName);
  // setAwaiting(true);
  const system = await window.electron.ipcRendererOCI.startSystem(
    'start-system',
    instanceConfigurationId,
    displayName
  );
  console.log(system);
  // listen for updates
  window.electron.ipcRendererOCI.listenUpdate(
    'start-system-update',
    (event, message) => {
      console.log('Hello! :D');
      console.log(message);
      if (message.status === 'success') {
        // setLoading(message.message);
        console.log(message.message);
      }
      if (message.status === 'error') {
        // setLoading(message.message);
        setError(message.error);
      }
    }
  );
}

async function reconnectSystemRequest(
  instanceConfigurationId,
  displayName,
  setError,
  setAwaiting
) {
  console.log(
    'reconnect system request: ',
    instanceConfigurationId,
    displayName
  );
  // setAwaiting(true);
  const system = await window.electron.ipcRendererOCI.reconnectSystem(
    'reconnect-system',
    instanceConfigurationId,
    displayName
  );
  console.log(system);
  // listen for updates
  window.electron.ipcRendererOCI.listenUpdate(
    'reconnect-system-update',
    (event, message) => {
      console.log('Hello! :D');
      console.log(message);
      if (message.status === 'success') {
        // setLoading(message.message);
        console.log(message.message);
      }
      if (message.status === 'error') {
        // setLoading(message.message);
        setError(message.error);
      }
    }
  );
}

function StartSystemButton({ selected, awaiting, setAwaiting, setError }: any) {
  console.log(selected.id);
  return (
    <button
      type="button"
      onClick={() =>
        startSystemRequest(
          selected.id,
          selected.displayName,
          setError,
          setAwaiting
        )
      }
      id={selected.id}
      disabled={awaiting}
    >
      Start {selected.displayName}?
    </button>
  );
}

function ReconnectSystemButton({
  selected,
  awaiting,
  setAwaiting,
  setError,
}: any) {
  console.log(selected.id);
  return (
    <button
      type="button"
      onClick={() =>
        startSystemRequest(
          selected.id,
          selected.displayName,
          setError,
          setAwaiting
        )
      }
      id={selected.id}
      disabled={awaiting}
    >
      Reconnect to {selected.displayName}?
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

export default function MainMenu({ ErrorPopup, error, setError }) {
  const [systems, setSystems] = useState([{}]);
  const [selected, setSelected] = useState({
    id: '',
    displayName: '',
    lifecycleState: '',
  });
  const [selectedNewSystem, setSelectedNewSystem] = useState({
    id: '',
    displayName: '',
  });
  const [awaiting, setAwaiting] = useState(false);
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
        {selected.id !== '' && selected.lifecycleState === 'RUNNING' ? (
          <ReconnectSystemButton
            selected={selected}
            awaiting={awaiting}
            setAwaiting={setAwaiting}
            setError={setError}
          />
        ) : null}
        {selected.id !== '' && selected.lifecycleState !== 'RUNNING' ? (
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
