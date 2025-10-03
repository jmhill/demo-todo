interface UserProfileProps {
  user: {
    id: string;
    username: string;
    email: string;
  };
  onLogout: () => void;
}

export const UserProfile = ({ user, onLogout }: UserProfileProps) => {
  return (
    <div>
      <h2>Welcome, {user.username}!</h2>
      <div>
        <p>
          <strong>Username:</strong> {user.username}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>User ID:</strong> {user.id}
        </p>
      </div>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
};
