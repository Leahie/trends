interface UploadToFirebaseProps{
    file: File, 
    token: string
}
export const uploadToFirebase = async({file, token}:UploadToFirebaseProps): Promise<string | null> => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('blockId', 'temp-' + Date.now());

        const response = await fetch(`${import.meta.env.VITE_API_URL}/images/upload`, {
            method: 'POST',
            body: formData, 
            headers: {
                Authorization: `Bearer ${token}`, 
            },
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        
        return data.url;
    } catch (error) {
        console.error('Error uploading file:', error);
        return null;
    }
}