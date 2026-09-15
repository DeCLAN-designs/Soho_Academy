import MessagingView from '../../../shared/MessagingView';

const MessagesTab = () => {
  return (
    <MessagingView allowedRecipients={['Transport Manager', 'School Admin']} />
  );
};

export default MessagesTab;
