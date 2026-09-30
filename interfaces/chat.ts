export interface PrivateMessageProps {
    messages?: any[],
    setMessages?: (value: (((prevState: any[]) => any[]) | any[])) => void,
    clientRef?: { sendMessage: (path: string, body: string) => void }
}