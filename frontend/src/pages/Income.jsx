import { Navigate } from 'react-router-dom';

export default function Income() {
  return <Navigate to="/transactions?type=income" replace />;
}
