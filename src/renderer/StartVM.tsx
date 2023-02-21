import {
  MemoryRouter as Router,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from 'react-router-dom';
import { useEffect, useState, Component } from 'react';
import { Transition } from 'react-transition-group';
import { act } from 'react-test-renderer';
import icon from '../../assets/icon.svg';
import './App.css';

export default function startVM(config) {
  // parse incoming config var

  // const { compartmentId } = config;
  // const { displayName } = config;
  // etc

  return window.electron.ipcRendererOCI.startVM('start-vm', {
    config,
  });
}
