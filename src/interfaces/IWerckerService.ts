export interface IWerckerService {
    id: string;
    tag: string;
    env?: { [key: string]: string};
    name: string;
    registry?: string;
}
