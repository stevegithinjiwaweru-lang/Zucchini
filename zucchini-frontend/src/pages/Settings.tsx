import React from 'react';
import { Card } from 'antd';

const Settings: React.FC = () => {
  return (
    <div>
      <h2>Settings</h2>

      <Card style={{ marginTop: 12 }}>
        <div style={{ color: 'var(--muted)' }}>
          System settings and configuration (placeholders)
        </div>
      </Card>
    </div>
  );
};

export default Settings;