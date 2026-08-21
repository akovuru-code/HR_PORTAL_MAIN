const fs = require('fs');

jest.mock('../src/models/payroll', () => ({
    findByPk: jest.fn(),
}));

jest.mock('../src/models/employee', () => ({}));

jest.mock('fs', () => ({
    existsSync: jest.fn(),
    createReadStream: jest.fn(),
}));

const Payroll = require('../src/models/payroll');
const { getFile } = require('../src/controllers/payrollController');

describe('payroll file handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns the actual MIME type and inline disposition for preview requests', async () => {
        Payroll.findByPk.mockResolvedValue({
            id: 1,
            w2Url: '/api/local-upload/file/2/example.pdf',
            w2OriginalName: 'example.pdf',
            payChequeUrl: null,
            payChequeOriginalName: null,
        });

        fs.existsSync.mockReturnValue(true);
        fs.createReadStream.mockReturnValue({ pipe: jest.fn() });

        const req = { params: { id: '1' }, query: { field: 'w2', disposition: 'inline' } };
        const res = {
            setHeader: jest.fn(),
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        await getFile(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="example.pdf"');
    });
});
