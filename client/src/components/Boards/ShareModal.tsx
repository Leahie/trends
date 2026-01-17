// components/ShareModal.tsx
import { useState } from 'react';
import { api } from '@/utils/api';
import { X, Copy, Check, Link as LinkIcon } from 'lucide-react';

interface ShareModalProps {
    open: boolean;
    boardId: string;
    onClose: () => void;
}

export default function ShareModal({ open, boardId, onClose }: ShareModalProps) {
    const [shareToken, setShareToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!open) return null;

    const generateLink = async () => {
        setLoading(true);
        const result = await api.generateShareLink(boardId);
        if (result.success && result.data) {
            setShareToken(result.data.shareToken);
        }
        setLoading(false);
    };

    const handleCopy = () => {
        if (!shareToken) return;
        const shareUrl = `${window.location.origin}/shared/${shareToken}`;
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRevoke = async () => {
        if (!window.confirm('Revoke this share link? Anyone with the link will lose access.')) {
            return;
        }
        setLoading(true);
        await api.revokeShareLink(boardId);
        setShareToken(null);
        setLoading(false);
    };

    const shareUrl = shareToken ? `${window.location.origin}/shared/${shareToken}` : '';

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" 
            onClick={onClose}
        >
            <div 
                className="bg-dark text-white p-6 rounded-xl shadow-xl w-[500px] border border-accent" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Share Board</h2>
                    <button onClick={onClose} className="hover:bg-highlight p-1 rounded">
                        <X size={20} />
                    </button>
                </div>

                {!shareToken ? (
                    <div>
                        <p className="text-sm text-gray-400 mb-4">
                            Generate a read-only link that you can share with anyone. 
                            They'll be able to view your board but not edit it.
                        </p>
                        <button
                            onClick={generateLink}
                            disabled={loading}
                            className="w-full px-4 py-2 rounded bg-accent hover:bg-highlight text-white flex items-center justify-center gap-2"
                        >
                            <LinkIcon size={16} />
                            {loading ? 'Generating...' : 'Generate Share Link'}
                        </button>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm text-gray-400 mb-2">Anyone with this link can view:</p>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="flex-1 px-3 py-2 bg-highlight border border-accent rounded text-sm"
                            />
                            <button
                                onClick={handleCopy}
                                className="px-4 py-2 rounded bg-accent hover:bg-highlight text-white flex items-center gap-2"
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <button
                            onClick={handleRevoke}
                            disabled={loading}
                            className="w-full px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                        >
                            {loading ? 'Revoking...' : 'Revoke Link'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}