/**
 * State Manager
 * Handles loading/saving session state for resume capability
 */

import fs from 'fs/promises';
import path from 'path';

export class StateManager {
  constructor(stateFilePath) {
    this.stateFilePath = stateFilePath;
    this.data = {};
  }

  async load() {
    try {
      const content = await fs.readFile(this.stateFilePath, 'utf-8');
      this.data = JSON.parse(content);
      console.log('✅ State loaded successfully');
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️ No previous state found');
        return false;
      }
      throw error;
    }
  }

  async save(updates = {}) {
    this.data = { ...this.data, ...updates };

    await fs.mkdir(path.dirname(this.stateFilePath), { recursive: true });
    await fs.writeFile(
      this.stateFilePath,
      JSON.stringify(this.data, null, 2)
    );

    console.log('💾 State saved');
  }

  initialize(data) {
    this.data = {
      version: '1.0',
      ...data,
      created_at: new Date().toISOString()
    };
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
  }
}
