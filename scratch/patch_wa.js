const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/WhatsAppAutomation.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `  useEffect(() => {
    loadData();
  }, []);`;

const replacement = `  useEffect(() => {
    loadData();
    const handleWaUpdate = (e) => {
      loadData();
      if (e.detail) {
        const msg = e.detail;
        setMessages(prev => [msg, ...prev]);
        showToast('New WhatsApp message dispatched to ' + (msg.leadName || 'client'));
      }
    };
    window.addEventListener('aps_whatsapp_updated', handleWaUpdate);
    return () => window.removeEventListener('aps_whatsapp_updated', handleWaUpdate);
  }, []);`;

// Normalize \r\n to match
if (content.includes(target.replace(/\n/g, '\r\n'))) {
  content = content.replace(target.replace(/\n/g, '\r\n'), replacement.replace(/\n/g, '\r\n'));
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: WhatsAppAutomation.jsx updated');
} else if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: WhatsAppAutomation.jsx updated (LF)');
} else {
  console.log('TARGET NOT FOUND');
}
