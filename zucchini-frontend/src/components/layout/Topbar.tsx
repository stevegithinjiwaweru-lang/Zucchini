import React from 'react'
import { useLocation } from 'react-router-dom'
import { BellOutlined, UserOutlined, CalendarOutlined, ShopOutlined } from '@ant-design/icons'
import { Avatar, Badge } from 'antd'

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of operations' },
  '/orders': { title: 'Orders', subtitle: 'Monitor Zucchini orders' },
  '/dispatch': { title: 'Dispatch', subtitle: 'Assign and track deliveries' },
  '/riders': { title: 'Riders', subtitle: 'Manage and monitor your delivery team' },
  '/tracking': { title: 'Tracking', subtitle: 'Live rider locations' },
  '/merchants': { title: 'Merchant Integration', subtitle: 'Zucchini integration' },
  '/reports': { title: 'Reports', subtitle: 'Performance and analytics (Zucchini-only)' },
  '/settings': { title: 'Settings', subtitle: 'Account and system settings' },
}

const today = new Date().toLocaleDateString(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const Topbar: React.FC<{ user: { id: string; name: string; role: string }; onLogout: () => void }> = ({ user, onLogout }) => {
  const { pathname } = useLocation()
  const page = PAGE_TITLES[pathname] || { title: 'Dashboard', subtitle: 'Overview of operations' }

  return (
    <div className="topbar">
      <div>
        <div className="page-title">{page.title}</div>
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>{page.subtitle}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="topbar-pill">
          <CalendarOutlined />
          <span>{today}</span>
        </div>
        <div className="topbar-pill">
          <ShopOutlined />
          <span>Zucchini</span>
        </div>
        <Badge count={2} size="small">
          <BellOutlined style={{ fontSize: 18 }} />
        </Badge>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{user.role.toUpperCase()}</div>
        </div>
        <Avatar
          icon={<UserOutlined />}
          style={{ cursor: 'pointer' }}
          onClick={onLogout}
        />
      </div>
    </div>
  )
}

export default Topbar
