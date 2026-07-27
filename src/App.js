import './styles/main.css';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {Toaster} from 'react-hot-toast';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import {RecoilRoot} from "recoil";

function App() {
    return (
        <>
            <div>
                <Toaster
                    position="top-center"
                    toastOptions={{
                        success: {
                            theme: {
                                primary: '#10b981',
                            },
                        },
                    }}
                />
            </div>
            <BrowserRouter>
                <RecoilRoot>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/editor" element={<EditorPage />} />
                        <Route path="/editor/:roomId" element={<EditorPage />} />
                        <Route path="/room/:roomId/view" element={<EditorPage />} />
                    </Routes>
                </RecoilRoot>
            </BrowserRouter>
        </>
    );
}

export default App;