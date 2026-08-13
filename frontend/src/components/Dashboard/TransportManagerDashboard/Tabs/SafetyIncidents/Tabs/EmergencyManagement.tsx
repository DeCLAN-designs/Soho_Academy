import { useState, useEffect } from 'react';
import axios from 'axios';
import './EmergencyManagement.css';

interface EmergencyContact {
  id?: number;
  name: string;
  role: string;
  phone: string;
  email: string;
  priority: 'High' | 'Medium' | 'Low';
}

interface EmergencyProtocol {
  id?: number;
  title: string;
  description: string;
  type: 'Medical' | 'Accident' | 'Breakdown' | 'Weather' | 'Security';
}

const EmergencyManagement = () => {
  const [activeTab, setActiveTab] = useState<'contacts' | 'protocols'>('contacts');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [protocols, setProtocols] = useState<EmergencyProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showProtocolModal, setShowProtocolModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [editingProtocol, setEditingProtocol] = useState<EmergencyProtocol | null>(null);

  const [contactForm, setContactForm] = useState<EmergencyContact>({
    name: '',
    role: '',
    phone: '',
    email: '',
    priority: 'Medium',
  });

  const [protocolForm, setProtocolForm] = useState<EmergencyProtocol>({
    title: '',
    description: '',
    type: 'Medical',
  });

  useEffect(() => {
    fetchEmergencyData();
  }, []);

  const fetchEmergencyData = async () => {
    try {
      setLoading(true);
      // For now, using mock data since backend endpoints don't exist yet
      // TODO: Replace with actual API calls when backend is ready
      setContacts([
        { id: 1, name: 'Dr. John Smith', role: 'School Doctor', phone: '+254700000001', email: 'doctor@soho.academy', priority: 'High' },
        { id: 2, name: 'Officer Jane Doe', role: 'Security', phone: '+254700000002', email: 'security@soho.academy', priority: 'High' },
        { id: 3, name: 'Roadside Assistance', role: 'Emergency Service', phone: '+254700000003', email: 'roadside@service.com', priority: 'Medium' },
      ]);
      setProtocols([
        { id: 1, title: 'Medical Emergency', description: 'Call school doctor immediately. If unreachable, call 911.', type: 'Medical' },
        { id: 2, title: 'Vehicle Breakdown', description: 'Contact roadside assistance. Notify parents of delay.', type: 'Breakdown' },
        { id: 3, title: 'Traffic Accident', description: 'Ensure student safety. Call police and ambulance. Notify school admin.', type: 'Accident' },
      ]);
    } catch (err: any) {
      setError('Failed to fetch emergency data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = () => {
    if (editingContact) {
      setContacts(contacts.map(c => c.id === editingContact.id ? { ...contactForm, id: editingContact.id } : c));
    } else {
      setContacts([...contacts, { ...contactForm, id: Date.now() }]);
    }
    setShowContactModal(false);
    setEditingContact(null);
    setContactForm({ name: '', role: '', phone: '', email: '', priority: 'Medium' });
  };

  const handleSaveProtocol = () => {
    if (editingProtocol) {
      setProtocols(protocols.map(p => p.id === editingProtocol.id ? { ...protocolForm, id: editingProtocol.id } : p));
    } else {
      setProtocols([...protocols, { ...protocolForm, id: Date.now() }]);
    }
    setShowProtocolModal(false);
    setEditingProtocol(null);
    setProtocolForm({ title: '', description: '', type: 'Medical' });
  };

  const handleDeleteContact = (id: number) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  const handleDeleteProtocol = (id: number) => {
    setProtocols(protocols.filter(p => p.id !== id));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return '#dc2626';
      case 'Medium': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Medical': return '#ef4444';
      case 'Accident': return '#f97316';
      case 'Breakdown': return '#eab308';
      case 'Weather': return '#3b82f6';
      case 'Security': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  if (loading) return <div className="loading">Loading emergency management...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="emergency-management">
      <div className="header">
        <h2>Emergency Management</h2>
        <div className="tabs">
          <button 
            className={activeTab === 'contacts' ? 'active' : ''}
            onClick={() => setActiveTab('contacts')}
          >
            Emergency Contacts
          </button>
          <button 
            className={activeTab === 'protocols' ? 'active' : ''}
            onClick={() => setActiveTab('protocols')}
          >
            Emergency Protocols
          </button>
        </div>
      </div>

      {activeTab === 'contacts' && (
        <div className="contacts-section">
          <div className="section-header">
            <h3>Emergency Contacts</h3>
            <button 
              className="btn-add"
              onClick={() => {
                setEditingContact(null);
                setContactForm({ name: '', role: '', phone: '', email: '', priority: 'Medium' });
                setShowContactModal(true);
              }}
            >
              Add Contact
            </button>
          </div>
          <div className="contacts-grid">
            {contacts.map((contact) => (
              <div key={contact.id} className="contact-card">
                <div className="contact-header">
                  <span className="contact-name">{contact.name}</span>
                  <span 
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(contact.priority) }}
                  >
                    {contact.priority}
                  </span>
                </div>
                <div className="contact-details">
                  <p><strong>Role:</strong> {contact.role}</p>
                  <p><strong>Phone:</strong> {contact.phone}</p>
                  <p><strong>Email:</strong> {contact.email}</p>
                </div>
                <div className="contact-actions">
                  <button 
                    className="btn-edit"
                    onClick={() => {
                      setEditingContact(contact);
                      setContactForm(contact);
                      setShowContactModal(true);
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => contact.id && handleDeleteContact(contact.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'protocols' && (
        <div className="protocols-section">
          <div className="section-header">
            <h3>Emergency Protocols</h3>
            <button 
              className="btn-add"
              onClick={() => {
                setEditingProtocol(null);
                setProtocolForm({ title: '', description: '', type: 'Medical' });
                setShowProtocolModal(true);
              }}
            >
              Add Protocol
            </button>
          </div>
          <div className="protocols-list">
            {protocols.map((protocol) => (
              <div key={protocol.id} className="protocol-card">
                <div className="protocol-header">
                  <span className="protocol-title">{protocol.title}</span>
                  <span 
                    className="type-badge"
                    style={{ backgroundColor: getTypeColor(protocol.type) }}
                  >
                    {protocol.type}
                  </span>
                </div>
                <p className="protocol-description">{protocol.description}</p>
                <div className="protocol-actions">
                  <button 
                    className="btn-edit"
                    onClick={() => {
                      setEditingProtocol(protocol);
                      setProtocolForm(protocol);
                      setShowProtocolModal(true);
                    }}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => protocol.id && handleDeleteProtocol(protocol.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingContact ? 'Edit Contact' : 'Add Contact'}</h3>
              <button className="close-btn" onClick={() => setShowContactModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <input
                  type="text"
                  value={contactForm.role}
                  onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={contactForm.priority}
                  onChange={(e) => setContactForm({ ...contactForm, priority: e.target.value as any })}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowContactModal(false)}>Cancel</button>
                <button className="btn-confirm" onClick={handleSaveContact}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProtocolModal && (
        <div className="modal-overlay" onClick={() => setShowProtocolModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProtocol ? 'Edit Protocol' : 'Add Protocol'}</h3>
              <button className="close-btn" onClick={() => setShowProtocolModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={protocolForm.title}
                  onChange={(e) => setProtocolForm({ ...protocolForm, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select
                  value={protocolForm.type}
                  onChange={(e) => setProtocolForm({ ...protocolForm, type: e.target.value as any })}
                >
                  <option value="Medical">Medical</option>
                  <option value="Accident">Accident</option>
                  <option value="Breakdown">Breakdown</option>
                  <option value="Weather">Weather</option>
                  <option value="Security">Security</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={protocolForm.description}
                  onChange={(e) => setProtocolForm({ ...protocolForm, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowProtocolModal(false)}>Cancel</button>
                <button className="btn-confirm" onClick={handleSaveProtocol}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyManagement;
