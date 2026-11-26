import { render, screen, fireEvent } from '@testing-library/react'
import PinPad from '@/components/PinPad'

describe('PinPad unit tests', () => {
  it('renders title, subtitle, and all keypad buttons', () => {
    render(<PinPad onSubmit={jest.fn()} error="" loading={false} />)
    expect(screen.getByText('Advance Tracker')).toBeInTheDocument()
    expect(screen.getByText('Enter your PIN to continue')).toBeInTheDocument()
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '⌫' })).toBeInTheDocument()
  })

  it('auto-submits on the 4th digit tap', () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    render(<PinPad onSubmit={onSubmit} error="" loading={false} />)

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '4' }))
    expect(onSubmit).toHaveBeenCalledWith('1234')
  })

  it('supports backspace and Clear before 4th digit', () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    render(<PinPad onSubmit={onSubmit} error="" loading={false} />)

    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByRole('button', { name: '⌫' }))
    fireEvent.click(screen.getByRole('button', { name: '9' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))
    fireEvent.click(screen.getByRole('button', { name: '0' }))

    expect(onSubmit).toHaveBeenCalledWith('0000')
  })

  it('displays error message and shows loading state', () => {
    const { rerender } = render(
      <PinPad onSubmit={jest.fn()} error="Incorrect PIN." loading={false} />
    )
    expect(screen.getByText('Incorrect PIN.')).toBeInTheDocument()

    rerender(<PinPad onSubmit={jest.fn()} error="" loading={true} />)
    expect(screen.getByText('Verifying…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled()
  })
})
