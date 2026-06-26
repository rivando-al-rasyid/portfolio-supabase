import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AdminPage } from '../features/admin/AdminPage';
import { LoginPage } from '../features/auth/LoginPage';
import { BlogDetailPage } from '../features/blog/BlogDetailPage';
import { BlogListPage } from '../features/blog/BlogListPage';
import { GraphPage } from '../features/graph/GraphPage';
import { HomePage } from '../features/home/HomePage';
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage';
import { ProjectListPage } from '../features/projects/ProjectListPage';
import { loginAction } from './actions/authActions';
import { adminLoader, loginLoader } from './loaders/authLoaders';
import {
  blogDetailLoader,
  blogListLoader,
  graphLoader,
  homeLoader,
  projectDetailLoader,
  projectListLoader
} from './loaders/contentLoaders';
import { NotFoundPage } from './NotFoundPage';
import { RouteError } from './RouteError';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, loader: homeLoader, element: <HomePage /> },
      { path: 'blog', loader: blogListLoader, element: <BlogListPage /> },
      { path: 'blog/:slug', loader: blogDetailLoader, element: <BlogDetailPage /> },
      { path: 'projects', loader: projectListLoader, element: <ProjectListPage /> },
      { path: 'projects/:slug', loader: projectDetailLoader, element: <ProjectDetailPage /> },
      { path: 'graph', loader: graphLoader, element: <GraphPage /> },
      { path: 'login', loader: loginLoader, action: loginAction, element: <LoginPage /> },
      { path: 'admin', loader: adminLoader, element: <AdminPage /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
