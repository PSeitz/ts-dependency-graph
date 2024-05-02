import React from 'react'

import { Button } from 'components/Button'
import { Input } from './components/Input'
import { DummyDynamicTsx } from './[uuid]/[uuid]'

export const App = () => {
    return (
        <div>
            <Input />
            <Button />
            <DummyDynamicTsx />
        </div>
    )
}
